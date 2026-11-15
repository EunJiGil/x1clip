// ATOM Echo 마이크 + 스피커 테스트
// 부팅 시 "삑" -> 버튼 누르고 말하기 -> 떼면 녹음된 목소리 재생
#include <Arduino.h>
#include <driver/i2s.h>

// ATOM Echo 핀
#define PIN_BCLK 19
#define PIN_LRCK 33
#define PIN_SPK  22
#define PIN_MIC  23
#define PIN_BTN  39

#define SAMPLE_RATE 16000
const size_t MAX_SAMPLES = SAMPLE_RATE * 5 / 2;  // 2.5초 = 80KB
int16_t *buf;
size_t recorded = 0;
bool i2sInstalled = false;

void uninstallI2S() {
  if (i2sInstalled) {
    i2s_driver_uninstall(I2S_NUM_0);
    i2sInstalled = false;
  }
}

void initMic() {
  uninstallI2S();
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_PDM);
  cfg.sample_rate = SAMPLE_RATE;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ALL_RIGHT;
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 6;
  cfg.dma_buf_len = 256;
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

void initSpeaker() {
  uninstallI2S();
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
  cfg.sample_rate = SAMPLE_RATE;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ALL_RIGHT;
  cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  cfg.dma_buf_count = 6;
  cfg.dma_buf_len = 256;
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

void beep(int freq, int ms) {
  initSpeaker();
  int n = SAMPLE_RATE * ms / 1000;
  int16_t s[256];
  size_t w;
  for (int i = 0; i < n; i += 256) {
    for (int j = 0; j < 256; j++)
      s[j] = (int16_t)(3000 * sin(2 * PI * freq * (i + j) / SAMPLE_RATE));
    i2s_write(I2S_NUM_0, s, sizeof(s), &w, portMAX_DELAY);
  }
  i2s_zero_dma_buffer(I2S_NUM_0);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BTN, INPUT);
  buf = (int16_t *)malloc(MAX_SAMPLES * sizeof(int16_t));
  if (!buf) {
    Serial.println("memory alloc failed!");
    while (1) delay(1000);
  }
  beep(1000, 200);
  Serial.println("READY: hold button and speak");
}

void loop() {
  if (digitalRead(PIN_BTN) == LOW) {
    Serial.println("recording...");
    initMic();
    recorded = 0;
    size_t r;
    while (digitalRead(PIN_BTN) == LOW && recorded < MAX_SAMPLES) {
      size_t want = min((size_t)256, MAX_SAMPLES - recorded);
      i2s_read(I2S_NUM_0, buf + recorded, want * 2, &r, portMAX_DELAY);
      recorded += r / 2;
    }
    Serial.printf("recorded %u samples, playing\n", (unsigned)recorded);

    // PDM 마이크 소리가 작아서 4배 증폭
    for (size_t i = 0; i < recorded; i++) {
      int32_t v = (int32_t)buf[i] * 4;
      buf[i] = (int16_t)constrain(v, -32768, 32767);
    }
    initSpeaker();
    size_t w;
    i2s_write(I2S_NUM_0, buf, recorded * 2, &w, portMAX_DELAY);
    i2s_zero_dma_buffer(I2S_NUM_0);
    while (digitalRead(PIN_BTN) == LOW) delay(10);
  }
  delay(10);
}
