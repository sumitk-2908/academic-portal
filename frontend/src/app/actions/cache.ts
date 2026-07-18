'use server'

import { updateTag } from 'next/cache';

export async function revalidateContentCache() {
  updateTag('subjects');
  updateTag('modules');
}
