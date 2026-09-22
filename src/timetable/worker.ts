import { generateTimetable, type GenerationInput, type GenerationResult } from './engine';

// If run in worker environment
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.onmessage = (event: MessageEvent<GenerationInput>) => {
    try {
      const result = generateTimetable({
        ...event.data,
        onProgress: (step, progress) => {
          self.postMessage({ type: 'PROGRESS', step, progress });
        },
      });
      self.postMessage({ type: 'SUCCESS', result });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        error: err?.message || 'Unknown error occurred during timetable generation.',
      });
    }
  };
}

/**
 * Runs timetable generation asynchronously, using a Web Worker if available,
 * with seamless fallback and progress notifications to keep the UI silky smooth.
 */
export async function runGenerationAsync(
  input: Omit<GenerationInput, 'onProgress'>,
  onProgress?: (step: string, progress: number) => void
): Promise<GenerationResult> {
  // Check if Worker is supported and we are in browser
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    return new Promise<GenerationResult>((resolve) => {
      try {
        const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'PROGRESS') {
            onProgress?.(e.data.step, e.data.progress);
          } else if (e.data.type === 'SUCCESS') {
            worker.terminate();
            resolve(e.data.result);
          } else if (e.data.type === 'ERROR') {
            worker.terminate();
            resolve({
              success: false,
              entries: [],
              diagnostics: [e.data.error],
            });
          }
        };

        worker.onerror = (err) => {
          console.warn('Worker error, falling back to direct async execution:', err);
          worker.terminate();
          // Fallback
          const directResult = generateTimetable({ ...input, onProgress });
          resolve(directResult);
        };

        worker.postMessage(input);
      } catch (err) {
        console.warn('Could not launch worker, using main thread async:', err);
        const directResult = generateTimetable({ ...input, onProgress });
        resolve(directResult);
      }
    });
  }

  // Fallback direct execution (e.g. in Vitest or environments without Web Workers)
  return new Promise((resolve) => {
    setTimeout(() => {
      const res = generateTimetable({ ...input, onProgress });
      resolve(res);
    }, 10);
  });
}
