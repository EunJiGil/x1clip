// ATOM Echo AI 안경 음성 클라이언트
// 버튼 누르고 말하기 -> 서버로 실시간 전송 -> 떼면 AI 답변(TTS) 재생
// LED: 파랑 깜빡=WiFi 연결중, 흰색(약)=대기, 빨강=녹음, 노랑=생각중, 초록=말하는중, 보라=에러
#include <Arduino.h>
#include <WiFi.h>
#include <driver/i2s.h>
#include "secrets.h"

#define PIN_BCLK 19
#define PIN_LRCK 33
#define PIN_SPK  22
#define PIN_MIC  23
#define PIN_BTN  39
#define PIN_LED  27

#define MIC_RATE 16000
#define SPK_RATE 24000   // OpenAI TTS pcm = 24kHz
#define MAX_RECORD_MS 30000
#define MIC_GAIN 4

bool i2sInstalled = false;

void led(uint8_t r, uint8_t g, uint8_t b) { rgbLedWrite(PIN_LED, r, g, b); }

void uninstallI2S() {
  if (i2sInstalled) { i2s_driver_uninstall(I2S_NUM_0); i2sInstalled = false; }
}

void initMic() {
  uninstallI2S();
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_PDM);
  cfg.sample_rate = MIC_RATE;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ALL_RIGHT;
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 8;
  cfg.dma_buf_len = 512;
  i2s_driver_install(I2S_NUM_0, &cfg, 0, NULL);
  i2sInstalled = true;
  i2s_pin_config_t pins = {};
  pins.mck_io_num = I2S_PIN_NO_CHANGE;
  pins.bck_io_num = I2S_PIN_NO_CHANGE;
  pins.ws_io_num = PIN_LRCK;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = PIN_MIC;
  i2s_set_pin(I2S_NUM_0, &pins);
}

void initSpeaker(int rate) {
  uninstallI2S();
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
  cfg.sample_rate = rate;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;  // 스테레오: 샘플마다 L/R 두 번 씀
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 8;
  cfg.dma_buf_len = 512;
  i2s_driver_install(I2S_NUM_0, &cfg, 0, NULL);
  i2sInstalled = true;
  i2s_pin_config_t pins = {};
  pins.mck_io_num = I2S_PIN_NO_CHANGE;
  pins.bck_io_num = PIN_BCLK;
  pins.ws_io_num = PIN_LRCK;
  pins.data_out_num = PIN_SPK;
  pins.data_in_num = I2S_PIN_NO_CHANGE;
  i2s_set_pin(I2S_NUM_0, &pins);
}

// 모노 샘플을 스테레오(L=R)로 써서 재생
void writeMono(const int16_t *mono, size_t n) {
  static int16_t st[1024];
  size_t w;
  while (n > 0) {
    size_t k = min(n, (size_t)512);
    for (size_t i = 0; i < k; i++) { st[2 * i] = mono[i]; st[2 * i + 1] = mono[i]; }
    i2s_write(I2S_NUM_0, st, k * 4, &w, portMAX_DELAY);
    mono += k;
    n -= k;
  }
}

void beep(int freq, int ms) {
  initSpeaker(MIC_RATE);
  int n = MIC_RATE * ms / 1000;
  int16_t s[256];
  for (int i = 0; i < n; i += 256) {
    for (int j = 0; j < 256; j++)
      s[j] = (int16_t)(2500 * sin(2 * PI * freq * (i + j) / MIC_RATE));
    writeMono(s, 256);
  }
  i2s_zero_dma_buffer(I2S_NUM_0);
}

void errorBeep() {
  led(40, 0, 40);
  beep(300, 150); delay(80); beep(300, 150);
}

// ---------- HTTP helpers ----------
bool readLine(WiFiClient &c, String &out, uint32_t timeoutMs) {
  out = "";
  uint32_t t = millis();
  while (millis() - t < timeoutMs) {
    while (c.available()) {
      char ch = c.read();
      if (ch == '\n') { out.trim(); return true; }
      out += ch;
    }
    if (!c.connected() && !c.available()) return out.length() > 0;
    delay(2);
  }
  return false;
}

size_t readSome(WiFiClient &c, uint8_t *buf, size_t want, uint32_t timeoutMs) {
  uint32_t t = millis();
  while (!c.available()) {
    if (!c.connected() || millis() - t > timeoutMs) return 0;
    delay(2);
  }
  int n = c.read(buf, min((size_t)c.available(), want));
  return n > 0 ? n : 0;
}

// PCM16 재생 (홀수 바이트 경계 처리)
uint8_t carryByte; bool hasCarry = false;
void playBytes(const uint8_t *p, size_t n) {
  static uint8_t tmp[1026] __attribute__((aligned(4)));
  size_t k = 0;
  if (hasCarry) { tmp[k++] = carryByte; hasCarry = false; }
  memcpy(tmp + k, p, n);
  k += n;
  if (k & 1) { carryByte = tmp[k - 1]; hasCarry = true; k--; }
  if (k) writeMono((const int16_t *)tmp, k / 2);
}

void sendChunk(WiFiClient &c, const void *data, size_t len) {
  c.printf("%X\r\n", (unsigned)len);
  c.write((const uint8_t *)data, len);
  c.print("\r\n");
}

// ---------- 메인 동작 ----------
void talk() {
  WiFiClient client;
  client.setNoDelay(true);
  led(60, 0, 0);
  if (!client.connect(SERVER_HOST, SERVER_PORT, 3000)) {
    Serial.println("server connect failed");
    errorBeep();
    return;
  }
  client.print("POST /api/voice HTTP/1.1\r\n");
  client.printf("Host: %s:%d\r\n", SERVER_HOST, SERVER_PORT);
  client.print("Content-Type: application/octet-stream\r\n");
  client.print("Transfer-Encoding: chunked\r\n");
  client.print("Connection: close\r\n\r\n");

  initMic();
  static int16_t samples[512];
  size_t r;
  // PDM 마이크 시작 잡음 버리기
  i2s_read(I2S_NUM_0, samples, sizeof(samples), &r, portMAX_DELAY);

  uint32_t start = millis();
  size_t total = 0;
  while (digitalRead(PIN_BTN) == LOW && millis() - start < MAX_RECORD_MS) {
    i2s_read(I2S_NUM_0, samples, sizeof(samples), &r, portMAX_DELAY);
    size_t n = r / 2;
    for (size_t i = 0; i < n; i++) {
      int32_t v = (int32_t)samples[i] * MIC_GAIN;
      samples[i] = (int16_t)constrain(v, -32768, 32767);
    }
    sendChunk(client, samples, r);
    total += r;
  }
  client.print("0\r\n\r\n");
  uninstallI2S();
  Serial.printf("sent %.1fs of audio\n", total / 2.0 / MIC_RATE);

  // 응답 대기
  led(60, 40, 0);
  String line;
  if (!readLine(client, line, 40000)) { Serial.println("no response"); errorBeep(); return; }
  Serial.println(line);
  bool ok = line.indexOf(" 200") > 0;
  bool chunked = false;
  while (readLine(client, line, 5000) && line.length() > 0) {
    line.toLowerCase();
    if (line.startsWith("transfer-encoding:") && line.indexOf("chunked") >= 0) chunked = true;
  }
  if (!ok) { errorBeep(); client.stop(); return; }

  // 재생
  led(0, 60, 0);
  initSpeaker(SPK_RATE);
  hasCarry = false;
  static uint8_t abuf[1024];
  if (chunked) {
    while (true) {
      if (!readLine(client, line, 15000)) break;
      if (line.length() == 0) continue;
      long n = strtol(line.c_str(), NULL, 16);
      if (n <= 0) break;
      while (n > 0) {
        size_t got = readSome(client, abuf, min((long)sizeof(abuf), n), 15000);
        if (!got) { n = -1; break; }
        playBytes(abuf, got);
        n -= got;
      }
      if (n < 0) break;
      readLine(client, line, 5000);  // chunk 끝 \r\n
    }
  } else {
    size_t got;
    while ((got = readSome(client, abuf, sizeof(abuf), 15000)) > 0) playBytes(abuf, got);
  }
  i2s_zero_dma_buffer(I2S_NUM_0);
  delay(200);
  uninstallI2S();
  client.stop();
  Serial.println("done");
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  int found = WiFi.scanNetworks();
  Serial.printf("scan: %d networks\n", found);
  for (int i = 0; i < found; i++)
    Serial.printf("  %-32s ch%-3d rssi%d enc%d\n", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i), WiFi.encryptionType(i));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("connecting to %s", WIFI_SSID);
  bool on = false;
  uint32_t t = millis();
  while (WiFi.status() != WL_CONNECTED) {
    on = !on;
    led(0, 0, on ? 60 : 0);
    Serial.print(".");
    delay(300);
    if (millis() - t > 15000) {
      Serial.printf("\nstatus=%d, retrying\n", WiFi.status());
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      t = millis();
    }
  }
  Serial.printf("\nWiFi OK, IP: %s\n", WiFi.localIP().toString().c_str());
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN, INPUT);
  led(0, 0, 0);
  connectWiFi();
  beep(880, 120); delay(60); beep(1320, 120);
  uninstallI2S();
  led(8, 8, 8);
  Serial.println("READY: hold button and speak");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (digitalRead(PIN_BTN) == LOW) {
    talk();
    while (digitalRead(PIN_BTN) == LOW) delay(10);
    led(8, 8, 8);
  }
  delay(10);
}
