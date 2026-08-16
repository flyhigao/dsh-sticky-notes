/**
 * dsh-sticky-notes host entry types.
 */
import type { Context } from '@deepseek-ai/cordis';

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface StickyNotesConfig {
  /** Reserved for future configuration. */
}

export declare const name = 'dsh-sticky-notes';
export declare function apply(ctx: Context, config?: StickyNotesConfig): void;
