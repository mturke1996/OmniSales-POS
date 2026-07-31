import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");

const javaHome =
  process.env.JAVA_HOME ||
  "C:\\Program Files\\Android\\Android Studio\\jbr";
const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

if (!fs.existsSync(androidDir)) {
  console.error("Android project missing. Run: pnpm android:sync");
  process.exit(1);
}

if (!fs.existsSync(javaHome)) {
  console.error(`JAVA_HOME not found: ${javaHome}`);
  process.exit(1);
}

if (!fs.existsSync(androidHome)) {
  console.error(`Android SDK not found: ${androidHome}`);
  process.exit(1);
}

const isWin = process.platform === "win32";
const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
};

console.log("Building debug APK...");
const result = spawnSync(gradlew, ["assembleDebug", "--stacktrace"], {
  cwd: androidDir,
  env,
  stdio: "inherit",
  shell: isWin,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const apk = path.join(
  androidDir,
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);

if (fs.existsSync(apk)) {
  const out = path.join(root, "OmniSales-debug.apk");
  fs.copyFileSync(apk, out);
  console.log(`APK ready: ${out}`);
} else {
  console.error("APK not found after build");
  process.exit(1);
}
