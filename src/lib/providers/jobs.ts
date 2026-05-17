import type { SystemEvent } from "@/core/events";

export type JobProviderName = "inline";

export interface JobProvider {
  readonly name: JobProviderName;
  dispatch<TPayload extends Record<string, unknown>>(
    event: SystemEvent<TPayload>,
    execute: (event: SystemEvent<TPayload>) => Promise<void>
  ): Promise<void>;
}

class InlineJobProvider implements JobProvider {
  readonly name = "inline" as const;

  dispatch<TPayload extends Record<string, unknown>>(
    event: SystemEvent<TPayload>,
    execute: (event: SystemEvent<TPayload>) => Promise<void>
  ) {
    return execute(event);
  }
}

export function getJobProvider(): JobProvider {
  const provider = process.env.JOB_PROVIDER || "inline";

  if (provider !== "inline") {
    throw new Error(`Unsupported JOB_PROVIDER: ${provider}`);
  }

  return new InlineJobProvider();
}
