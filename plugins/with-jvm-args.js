const {withGradleProperties} = require('expo/config-plugins');

// Keep the Gradle daemon within a memory budget that fits alongside the Kotlin
// compiler workers and Metro. A 4GB heap starves memory-constrained hosts
// (e.g. WSL2) and causes the VM to be OOM-killed mid-build.
const GRADLE_PROPERTIES = {
  'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
  // Cap concurrent Gradle workers so parallel module builds don't spike RAM.
  'org.gradle.workers.max': '4',
  // Bound the Kotlin daemon heap
  'kotlin.daemon.jvmargs': '-Xmx3072m',
};

function upsertProperty(modResults, key, value) {
  const existing = modResults.find(
    item => item.type === 'property' && item.key === key,
  );
  if (existing) {
    existing.value = value;
  } else {
    modResults.push({type: 'property', key, value});
  }
}

module.exports = function withJvmArgs(config) {
  return withGradleProperties(config, cfg => {
    for (const [key, value] of Object.entries(GRADLE_PROPERTIES)) {
      upsertProperty(cfg.modResults, key, value);
    }
    return cfg;
  });
};
