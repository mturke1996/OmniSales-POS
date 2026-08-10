import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidDir = path.join(root, "android");

function firstExisting(paths) {
  return paths.find((p) => p && fs.existsSync(p));
}

function detectJavaHome() {
  if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
    return process.env.JAVA_HOME;
  }
  const which = spawnSync("which", ["java"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) {
    try {
      const real = fs.realpathSync(which.stdout.trim());
      const home = path.resolve(real, "..", "..");
      if (fs.existsSync(path.join(home, "bin", "java"))) return home;
    } catch {
      /* ignore */
    }
  }
  return firstExisting([
    "/usr/lib/jvm/java-17-openjdk-amd64",
    "/usr/lib/jvm/java-17-openjdk",
    "/usr/lib/jvm/default-java",
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "C:\\Program Files\\Java\\jdk-17",
  ]);
}

function detectAndroidHome() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return firstExisting([
    path.join(home, "Android", "Sdk"),
    path.join(home, "Library", "Android", "sdk"),
    path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
    "/opt/android-sdk",
  ]);
}

if (!fs.existsSync(androidDir)) {
  console.error("Android project missing. Run: pnpm android:sync");
  process.exit(1);
}

const javaHome = detectJavaHome();
const androidHome = detectAndroidHome();

if (!javaHome) {
  console.error("JAVA_HOME not found. Install JDK 17 or set JAVA_HOME.");
  process.exit(1);
}

if (!androidHome) {
  console.error(
    "Android SDK not found. Install Android SDK or set ANDROID_HOME / ANDROID_SDK_ROOT."
  );
  process.exit(1);
}

const isWin = process.platform === "win32";
const gradlew = path.join(androidDir, isWin ? "gradlew.bat" : "gradlew");

if (!fs.existsSync(gradlew)) {
  console.error(`Gradle wrapper missing: ${gradlew}`);
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
};

console.log(`JAVA_HOME=${javaHome}`);
console.log(`ANDROID_HOME=${androidHome}`);
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
  "app-debug.apk"
);

if (fs.existsSync(apk)) {
  const out = path.join(root, "OmniSales-debug.apk");
  fs.copyFileSync(apk, out);
  console.log(`APK ready: ${out}`);
} else {
  console.error("APK not found after build");
  process.exit(1);
}
