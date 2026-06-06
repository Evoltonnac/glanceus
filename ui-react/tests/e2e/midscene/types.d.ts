import '@playwright/test';
import type { PlaywrightAiFixtureType } from '@midscene/web/playwright';

declare module '@playwright/test' {
  interface PlaywrightTestArgs {
    agentForPage: PlaywrightAiFixtureType['agentForPage'];
  }
}
