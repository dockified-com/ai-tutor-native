export const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  javascript: 63,
  typescript: 74,
  cpp: 54,
  java: 62,
  c: 50,
  go: 60,
  ruby: 72,
  rust: 73,
};

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  status: string;
}

export async function executeCode(code: string, language: string): Promise<Judge0Result> {
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const url = process.env.JUDGE0_API_URL!;
  const key = process.env.JUDGE0_API_KEY!;
  const isRapidApi = url.includes("rapidapi");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isRapidApi) {
    const host = new URL(url).hostname;
    headers["X-RapidAPI-Key"] = key;
    headers["X-RapidAPI-Host"] = host;
  } else {
    headers["X-Auth-Token"] = key;
  }

  const res = await fetch(`${url}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source_code: code, language_id: languageId }),
  });

  if (!res.ok) throw new Error(`Judge0 error: ${res.status}`);
  const data = await res.json();

  return {
    stdout: data.stdout ?? null,
    stderr: data.stderr ?? data.compile_output ?? null,
    status: data.status?.description ?? "Unknown",
  };
}

export function evaluateVerdict(
  result: Judge0Result,
  expectedOutput: string | null | undefined
): string {
  if (result.status !== "Accepted") {
    return result.status.includes("Compilation") ? "compile_error" : "runtime_error";
  }
  if (expectedOutput != null) {
    return (result.stdout ?? "").trim() === expectedOutput.trim() ? "passed" : "failed";
  }
  return "needs_ai_eval";
}