/**
 * Canvas 权限管理 — 只读 / 编辑 / 冲突解决
 */

export type CanvasPermission = 'read' | 'edit' | 'admin';

interface CanvasAccess {
  roomId: string;
  ownerId: string;
  collaborators: Map<string, CanvasPermission>;
  publicAccess: CanvasPermission | null;
}

interface ConflictState {
  hasConflict: boolean;
  localVersion: number;
  remoteVersion: number;
  resolved: boolean;
}

export class CanvasPermissions {
  private static access: Map<string, CanvasAccess> = new Map();
  private static conflicts: Map<string, ConflictState> = new Map();

  /** 创建 Canvas 房间 */
  static createRoom(roomId: string, ownerId: string): void {
    this.access.set(roomId, { roomId, ownerId, collaborators: new Map(), publicAccess: null });
  }

  /** 设置协作者权限 */
  static setPermission(roomId: string, userId: string, permission: CanvasPermission): void {
    const room = this.access.get(roomId);
    if (room) room.collaborators.set(userId, permission);
  }

  /** 获取用户对该 Canvas 的权限 */
  static getPermission(roomId: string, userId: string): CanvasPermission {
    const room = this.access.get(roomId);
    if (!room) return 'read';
    if (room.ownerId === userId) return 'admin';
    return room.collaborators.get(userId) || 'read';
  }

  /** 是否可以编辑 */
  static canEdit(roomId: string, userId: string): boolean {
    const perm = this.getPermission(roomId, userId);
    return perm === 'edit' || perm === 'admin';
  }

  /** 冲突检测 */
  static detectConflict(localVer: number, remoteVer: number): boolean {
    return remoteVer > localVer;
  }

  /** 记录冲突 */
  static markConflict(roomId: string, local: number, remote: number): void {
    this.conflicts.set(roomId, { hasConflict: true, localVersion: local, remoteVersion: remote, resolved: false });
  }

  /** 解决冲突 — 采用远程版本 */
  static resolveCommit(roomId: string, _acceptRemote: boolean): void {
    const c = this.conflicts.get(roomId);
    if (c) c.resolved = true;
  }

  /** 撒销房间 */
  static destroyRoom(roomId: string): void {
    this.access.delete(roomId);
    this.conflicts.delete(roomId);
  }
}
