// Subtitle translations running on the server, for the Store's AI jobs panel: the Subtitle
// Editor's translate-and-save jobs (RemoteConnection routes/translate.js) and translations asked
// for in the AI chat (routes/ai.js). Both keep going with the browser closed.
import { useJobList } from './autoFilter';

export const TRANSLATE_EVENT = 'sc:translate-started';

export function useTranslateJobs(domain, options) {
    const editorJobs = useJobList(domain, '/translate/jobs', TRANSLATE_EVENT, options);
    const chatJobs = useJobList(domain, '/ai/jobs', TRANSLATE_EVENT, options);
    return [...editorJobs, ...chatJobs];
}

export const TRANSLATE_STAGE_LABELS = { translating: 'Translating' };
