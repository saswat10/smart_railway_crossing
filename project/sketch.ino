#include <ESP32Servo.h>

// --- Pins ---
const int TRIG = 5, ECHO = 18;
const int SERVO_PIN = 13;
const int RED_LED = 14, GREEN_LED = 12, BUZZER = 25;

// --- Tunable thresholds (toy-train scale) ---
const int THRESHOLD_CM = 100;   // "train detected" within this distance
const int CLEAR_MS     = 2000;  // how long "far" before reopening

Servo barrier;
String state = "IDLE";
unsigned long clearStart = 0;

long readDistanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur = pulseIn(ECHO, HIGH, 30000);
  return dur == 0 ? 999 : dur * 0.034 / 2;   // swap for TF-Luna read on real hardware
}

void setBarrier(bool closed) {
  barrier.write(closed ? 85 : 0);
  digitalWrite(RED_LED, closed);
  digitalWrite(GREEN_LED, !closed);
  digitalWrite(BUZZER, closed);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  pinMode(RED_LED, OUTPUT); pinMode(GREEN_LED, OUTPUT); pinMode(BUZZER, OUTPUT);
  barrier.attach(SERVO_PIN);
  setBarrier(false);   // start open
}

void loop() {
  long d = readDistanceCm();
  Serial.printf("dist=%ld cm | state=%s\n", d, state.c_str());

  if (state == "IDLE" && d < THRESHOLD_CM) {
    state = "BARRIER_DOWN"; setBarrier(true);
  }
  else if (state == "BARRIER_DOWN" && d >= THRESHOLD_CM) {
    state = "CLEARING"; clearStart = millis();
  }
  else if (state == "CLEARING") {
    if (d < THRESHOLD_CM) { state = "BARRIER_DOWN"; }
    else if (millis() - clearStart > CLEAR_MS) { state = "IDLE"; setBarrier(false); }
  }
  delay(100);
}