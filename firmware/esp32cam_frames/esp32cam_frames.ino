// ESP32-CAM (AI Thinker): Echo 버튼을 누를 때만 한 장 찍어서 노트북 서버 /api/frame 으로 업로드
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

// AI Thinker ESP32-CAM 핀
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define LED_RED 33  // 뒷면 작은 빨간 LED (LOW=켜짐)

String url;
String captureUrl;

bool initCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_VGA;  // 640x480
  c.jpeg_quality = 12;
  c.fb_count = 2;
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;
  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("camera init failed 0x%x\n", err);
    return false;
  }
  return true;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  int found = WiFi.scanNetworks();
  Serial.printf("scan: %d networks\n", found);
  for (int i = 0; i < found; i++)
    Serial.printf("  %-32s ch%-3d rssi%d\n", WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("connecting to %s", WIFI_SSID);
  uint32_t t = millis();
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_RED, !digitalRead(LED_RED));
    Serial.print(".");
    delay(300);
    if (millis() - t > 15000) {
      Serial.printf("\nstatus=%d, retrying\n", WiFi.status());
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      t = millis();
    }
  }
  digitalWrite(LED_RED, HIGH);
  Serial.printf("\nWiFi OK, IP: %s\n", WiFi.localIP().toString().c_str());
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_RED, OUTPUT);
  digitalWrite(LED_RED, HIGH);
  if (!initCamera()) {
    delay(3000);
    ESP.restart();
  }
  connectWiFi();
  url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/frame";
  captureUrl = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/capture?seq=";
  Serial.println("READY: waiting for capture requests");
}

void captureAndUpload() {
  // 버퍼에 남은 예전 프레임 버리고 새로 찍기
  camera_fb_t *old = esp_camera_fb_get();
  if (old) esp_camera_fb_return(old);
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) { Serial.println("capture failed"); return; }
  digitalWrite(LED_RED, LOW);  // 찍는 동안 뒷면 빨간 LED 켜짐
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(url);
  http.addHeader("Content-Type", "image/jpeg");
  int code = http.POST(fb->buf, fb->len);
  Serial.printf("frame %u bytes -> %d\n", (unsigned)fb->len, code);
  http.end();
  esp_camera_fb_return(fb);
  digitalWrite(LED_RED, HIGH);
}

// 서버에 "찍을 일 있어?" 물어보기 (서버가 최대 20초 붙잡고 있다가 요청 오면 바로 응답)
long seq = -1;
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  HTTPClient http;
  http.setTimeout(25000);
  String q = captureUrl + (seq >= 0 ? String(seq) : String(""));
  http.begin(q);
  int code = http.GET();
  if (code != 200) {
    Serial.printf("poll failed: %d\n", code);
    http.end();
    delay(1000);
    return;
  }
  String body = http.getString();  // "<seq> capture" | "<seq> idle"
  http.end();
  int sp = body.indexOf(' ');
  long newSeq = body.substring(0, sp).toInt();
  bool capture = body.indexOf("capture") > 0;
  seq = newSeq;
  if (capture) {
    Serial.printf("capture request #%ld\n", seq);
    captureAndUpload();
  }
}
