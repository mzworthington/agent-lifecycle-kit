export type OwnershipReason = 'owned' | 'fork' | 'archived' | 'not-admin' | 'github-unavailable';

export interface RepoView {
  nameWithOwner: string;
  ownerLogin: string;
  isFork: boolean;
  isArchived: boolean;
  viewerPermission: string;
}

export interface Ownership {
  inScope: boolean;
  reason: OwnershipReason;
  nameWithOwner: string | undefined;
}

export function evaluateOwnership(view: RepoView | undefined): Ownership {
  if (!view) {
    return { inScope: false, reason: 'github-unavailable', nameWithOwner: undefined };
  }
  if (view.isArchived) {
    return { inScope: false, reason: 'archived', nameWithOwner: view.nameWithOwner };
  }
  if (view.isFork) {
    return { inScope: false, reason: 'fork', nameWithOwner: view.nameWithOwner };
  }
  const perm = view.viewerPermission.trim().toUpperCase();
  if (perm !== 'ADMIN' && perm !== 'MAINTAIN') {
    return { inScope: false, reason: 'not-admin', nameWithOwner: view.nameWithOwner };
  }
  return { inScope: true, reason: 'owned', nameWithOwner: view.nameWithOwner };
}

/** Local `wk init --hook` still works offline. Doctor writes and fork clones do not. */
export function shouldInstallInitHooks(ownership: Ownership, requested: boolean): boolean {
  if (!requested) return false;
  if (ownership.reason === 'fork' || ownership.reason === 'archived' || ownership.reason === 'not-admin') {
    return false;
  }
  return true;
}
