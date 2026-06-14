#include <ESP32Servo.h>

// --- Pins ---
const int TRIG = 5, ECHO = 18;
const int SERVO_PIN = 13;
const int RED_LED = 14, GREEN_LED = 12, BUZZER = 25;
const int VIBRATION_PIN = 4;     // pushbutton = simulated rail vibration

// --- Tunable thresholds ---
const int THRESHOLD_CM = 100;    // "object close" within this distance
const int CLEAR_MS     = 2000;   // how long clear before reopening

Servo barrier;
String state = "IDLE";
unsigned long clearStart = 0;

long readDistanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur = pulseIn(ECHO, HIGH, 30000);
  return dur == 0 ? 999 : dur * 0.034 / 2;
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
  pinMode(VIBRATION_PIN, INPUT_PULLUP);   // button: pressed = LOW
  barrier.attach(SERVO_PIN);
  setBarrier(false);   // start open
}

void loop() {
  long d = readDistanceCm();
  bool vibration = (digitalRead(VIBRATION_PIN) == LOW);   // pressed = vibration present

  // --- THE DECIDING FACTOR: sensor fusion ---
  // A real train trips BOTH the distance sensor AND rail vibration.
  // An animal / stray object trips distance only -> NOT a train -> gate stays open.
  bool objectClose   = (d < THRESHOLD_CM);
  bool trainDetected = objectClose && vibration;

  // Helpful live readout showing WHY it decided what it did
  String reason;
  if (!objectClose)            reason = "clear";
  else if (objectClose && !vibration) reason = "OBJECT but NO vibration -> ignore (false alarm rejected)";
  else                         reason = "OBJECT + vibration -> TRAIN";
  Serial.printf("dist=%3ld cm | vibration=%d | %s | state=%s\n",
                d, vibration, reason.c_str(), state.c_str());

  if (state == "IDLE" && trainDetected) {
    state = "BARRIER_DOWN"; setBarrier(true);
  }
  else if (state == "BARRIER_DOWN" && (!objectClose || !vibration)) {
    state = "CLEARING"; clearStart = millis();
  }
  else if (state == "CLEARING") {
    if (trainDetected) { state = "BARRIER_DOWN"; }
    else if (millis() - clearStart > CLEAR_MS) { state = "IDLE"; setBarrier(false); }
  }
  delay(100);
}