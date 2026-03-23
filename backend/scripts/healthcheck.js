const DEFAULT_BASE_URL = 'http://127.0.0.1:4000';
const API_BASE_URL = process.env.API_BASE_URL || DEFAULT_BASE_URL;
const REQUEST_TIMEOUT_MS = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5000);

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

async function requestJson(path) {
  const { signal, clear } = timeoutSignal(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return payload;
  } finally {
    clear();
  }
}

async function main() {
  const startedAt = Date.now();
  const health = await requestJson('/health');

  if (!health.ok) {
    throw new Error('Health endpoint returned ok=false');
  }

  const summary = {
    ok: health.ok,
    service: health.service,
    databaseConfigured: health.databaseConfigured,
    baseUrl: API_BASE_URL,
    responseTimeMs: Date.now() - startedAt,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl: API_BASE_URL,
        error: error.message,
      },
      null,
      2
    )
  );
  process.exit(1);
});
