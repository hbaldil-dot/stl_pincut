import * as THREE from 'three';

/**
 * BaseCommand - Abstract Command interface in the GoF Command Pattern.
 * Every concrete command encapsulates an action, its target parameters,
 * and the logic to execute, undo, and redo that action.
 */
export class BaseCommand {
  constructor({
    id = null,
    name = 'İşlem',
    description = 'İşlem gerçekleştirildi',
    type = 'GENERAL',
    subType = null,
    timestamp = Date.now(),
    isContinuous = false
  } = {}) {
    this.id = id || `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    this.name = name;
    this.description = description;
    this.type = type;
    this.subType = subType;
    this.timestamp = timestamp;
    this.isContinuous = isContinuous;
  }

  /**
   * Applies the command changes to the application context.
   * @param {Object} context Application state mutation context
   */
  execute(context) {
    throw new Error('BaseCommand.execute() must be implemented by subclass');
  }

  /**
   * Inverts the command changes, restoring the prior state.
   * @param {Object} context Application state mutation context
   */
  undo(context) {
    throw new Error('BaseCommand.undo() must be implemented by subclass');
  }

  /**
   * Re-applies the command changes (defaults to execute).
   * @param {Object} context Application state mutation context
   */
  redo(context) {
    return this.execute(context);
  }

  /**
   * Determines if a subsequent command can be merged (coalesced) into this one,
   * preventing excessive history items during continuous actions like slider dragging.
   * @param {BaseCommand} other Next command
   * @returns {boolean}
   */
  canMergeWith(other) {
    return false;
  }

  /**
   * Merges the subsequent command's target state into this command.
   * @param {BaseCommand} other
   */
  merge(other) {
    this.timestamp = other.timestamp;
  }

  /**
   * Returns a concise summary of the state delta for UI inspection.
   * @returns {string|null}
   */
  getDiffSummary() {
    return null;
  }
}

/**
 * ModelTransformCommand - Tracks 3D model orientation, rotations, and alignment.
 */
export class ModelTransformCommand extends BaseCommand {
  constructor({
    previousRotation,
    newRotation,
    description = null,
    subType = 'rotation_general',
    isContinuous = false
  }) {
    const rx = Math.round(newRotation?.x ?? 0);
    const ry = Math.round(newRotation?.y ?? 0);
    const rz = Math.round(newRotation?.z ?? 0);

    const desc =
      description ||
      (subType === 'rotation_snap'
        ? 'Model Tablaya Oturtuldu (90° Snap)'
        : subType === 'rotation_reset'
        ? 'Model Yönelimi Sıfırlandı (0°, 0°, 0°)'
        : `Model Döndürüldü (X:${rx}° Y:${ry}° Z:${rz}°)`);

    super({
      name: 'Model Yönelimi',
      description: desc,
      type: 'MODEL_TRANSFORM',
      subType,
      isContinuous
    });

    this.previousRotation = {
      x: previousRotation?.x ?? 0,
      y: previousRotation?.y ?? 0,
      z: previousRotation?.z ?? 0
    };
    this.newRotation = {
      x: newRotation?.x ?? 0,
      y: newRotation?.y ?? 0,
      z: newRotation?.z ?? 0
    };
  }

  execute(context) {
    if (context.setModelRotation) {
      context.setModelRotation(this.newRotation);
    }
  }

  undo(context) {
    if (context.setModelRotation) {
      context.setModelRotation(this.previousRotation);
    }
  }

  canMergeWith(other) {
    if (!(other instanceof ModelTransformCommand)) return false;
    if (this.subType !== other.subType) return false;
    const isSlider =
      this.isContinuous ||
      other.isContinuous ||
      ['rotation_drag', 'rotation_gizmo'].includes(this.subType);
    return isSlider && other.timestamp - this.timestamp < 1000;
  }

  merge(other) {
    this.newRotation = { ...other.newRotation };
    this.description = other.description;
    this.timestamp = other.timestamp;
  }

  getDiffSummary() {
    const rx = Math.round(this.newRotation.x);
    const ry = Math.round(this.newRotation.y);
    const rz = Math.round(this.newRotation.z);
    const px = Math.round(this.previousRotation.x);
    const py = Math.round(this.previousRotation.y);
    const pz = Math.round(this.previousRotation.z);
    return `[X:${px}° Y:${py}° Z:${pz}°] → [X:${rx}° Y:${ry}° Z:${rz}°]`;
  }
}

/**
 * Helper to deep clone a clipping plane configuration
 */
function cloneClippingConfig(cfg) {
  if (!cfg) {
    return {
      enabled: false,
      axis: 'y',
      offset: 0,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      negate: false,
      showPlaneHelper: true,
      addPinOnSlice: true,
      highlightInterior: true,
      interiorColor: '#f59e0b',
      normal: new THREE.Vector3(0, 1, 0)
    };
  }
  return {
    ...cfg,
    normal: cfg.normal ? cfg.normal.clone() : new THREE.Vector3(0, 1, 0)
  };
}

/**
 * CutPlaneAdjustCommand - Tracks cut plane position, orientation, axis, and parameters.
 */
export class CutPlaneAdjustCommand extends BaseCommand {
  constructor({
    previousConfig,
    newConfig,
    description = null,
    subType = 'clipping_general',
    isContinuous = false
  }) {
    let desc = description;
    if (!desc) {
      if (subType === 'clipping_axis') {
        desc =
          newConfig?.axis === 'custom'
            ? 'Kesit Düzlemi: Serbest Açı'
            : `Kesit Düzlemi: ${newConfig?.axis?.toUpperCase()} Ekseni`;
      } else if (subType === 'clipping_offset') {
        desc = `Düzlem Konumu: ${newConfig?.offset?.toFixed(1)} mm`;
      } else if (subType === 'clipping_rot') {
        const rx = Math.round(newConfig?.rotX || 0);
        const ry = Math.round(newConfig?.rotY || 0);
        const rz = Math.round(newConfig?.rotZ || 0);
        desc = `Düzlem Açısı: X:${rx}° Y:${ry}° Z:${rz}°`;
      } else if (subType === 'clipping_negate') {
        desc = newConfig?.negate ? 'Düzlem Yönü Ters Çevrildi' : 'Düzlem Normal Yönü';
      } else if (subType === 'clipping_helper') {
        desc = newConfig?.showPlaneHelper === false ? 'Gizli Düzlem (İç İnceleme)' : 'Kılavuz Düzlemi Görünür';
      } else if (subType === 'clipping_highlight') {
        desc = newConfig?.highlightInterior ? 'İç Yüzey Vurgusu Açık' : 'İç Yüzey Vurgusu Kapalı';
      } else if (subType === 'clipping_snap_a') {
        desc = 'Düzlem Nokta A Hizasına Konumlandırıldı';
      } else if (subType === 'clipping_snap_b') {
        desc = 'Düzlem Nokta B Hizasına Konumlandırıldı';
      } else if (subType === 'clipping_snap_mid') {
        desc = 'Düzlem A-B Ortasına Konumlandırıldı';
      } else if (subType === 'clipping_align_ab') {
        desc = 'Düzlem A→B Doğrultusuna Dik Hizalandı';
      } else {
        desc = 'Kesit Düzlemi Güncellendi';
      }
    }

    super({
      name: 'Kesit Düzlemi',
      description: desc,
      type: 'CUT_PLANE_ADJUST',
      subType,
      isContinuous
    });

    this.previousConfig = cloneClippingConfig(previousConfig);
    this.newConfig = cloneClippingConfig(newConfig);
  }

  execute(context) {
    if (context.setClippingConfig) {
      context.setClippingConfig(this.newConfig);
    }
  }

  undo(context) {
    if (context.setClippingConfig) {
      context.setClippingConfig(this.previousConfig);
    }
  }

  canMergeWith(other) {
    if (!(other instanceof CutPlaneAdjustCommand)) return false;
    if (this.subType !== other.subType) return false;
    const isSlider =
      this.isContinuous ||
      other.isContinuous ||
      ['clipping_offset', 'clipping_rot'].includes(this.subType);
    return isSlider && other.timestamp - this.timestamp < 1000;
  }

  merge(other) {
    this.newConfig = cloneClippingConfig(other.newConfig);
    this.description = other.description;
    this.timestamp = other.timestamp;
  }

  getDiffSummary() {
    if (this.subType === 'clipping_offset') {
      const p = this.previousConfig.offset?.toFixed(1) ?? '0.0';
      const n = this.newConfig.offset?.toFixed(1) ?? '0.0';
      return `${p} mm → ${n} mm`;
    }
    if (this.subType === 'clipping_axis') {
      return `${this.previousConfig.axis?.toUpperCase()} → ${this.newConfig.axis?.toUpperCase()}`;
    }
    if (this.subType === 'clipping_rot') {
      return `X:${Math.round(this.newConfig.rotX || 0)}° Y:${Math.round(this.newConfig.rotY || 0)}° Z:${Math.round(this.newConfig.rotZ || 0)}°`;
    }
    return null;
  }
}

/**
 * Helper to deep clone pin configuration
 */
function clonePinConfig(cfg) {
  if (!cfg) return {};
  return { ...cfg };
}

/**
 * PinPlacementCommand - Tracks alignment pin placement, dimensions, mode, and position offsets.
 */
export class PinPlacementCommand extends BaseCommand {
  constructor({
    previousConfig,
    newConfig,
    description = null,
    subType = 'pin_general',
    isContinuous = false
  }) {
    let desc = description;
    if (!desc) {
      if (subType === 'pin_mode') {
        const modeLabel =
          newConfig.mode === 'holes_both'
            ? 'Çift Delik (Dübel)'
            : newConfig.mode === 'pin_and_hole'
            ? 'Pim + Delik'
            : newConfig.mode === 'hole_only'
            ? 'Yalnızca Delik'
            : newConfig.mode === 'pin_only'
            ? 'Yalnızca Pim'
            : 'Düz Kesim';
        desc = `Bağlantı Modu: ${modeLabel}`;
      } else if (subType === 'pin_diameter') {
        const d = newConfig.diameter ?? newConfig.size ?? 6;
        desc = `Pim Çapı: Ø${d} mm`;
      } else if (subType === 'pin_depth') {
        const dp = newConfig.depth ?? newConfig.height ?? 12;
        desc = `Pim Derinliği: ${dp} mm`;
      } else if (subType === 'pin_clearance') {
        const clr = newConfig.clearance ?? 0.2;
        desc = `Fit Toleransı: +${clr.toFixed(2)} mm`;
      } else if (subType === 'pin_offset_u' || subType === 'pin_offset_v' || subType === 'pin_offset_both') {
        const u = newConfig.offsetU?.toFixed(1) ?? '0.0';
        const v = newConfig.offsetV?.toFixed(1) ?? '0.0';
        desc = `Pim Konumu: U:${newConfig.offsetU > 0 ? '+' : ''}${u} V:${newConfig.offsetV > 0 ? '+' : ''}${v} mm`;
      } else if (subType === 'pin_snap_all') {
        desc = 'Pim Merkeze & Normaline Kitlendi (90° Flush)';
      } else if (subType === 'pin_snap_normal') {
        desc = newConfig.snapToNormal ? 'Yüzey Normaline Kitle: Açık (90° Dik)' : 'Yüzey Normaline Kitle: Serbest';
      } else if (subType === 'pin_snap_center') {
        desc = newConfig.snapToCenter ? 'Kesit Merkezine Kitle: Açık' : 'Kesit Merkezine Kitle: Serbest';
      } else if (subType === 'pin_flush') {
        desc = newConfig.flushFit ? 'Flush Fit: Açık' : 'Flush Fit: Kapalı';
      } else if (subType === 'pin_type') {
        const typeLabel =
          newConfig.type === 'hex'
            ? 'Altıgen'
            : newConfig.type === 'square'
            ? 'Kare'
            : newConfig.type === 'countersink'
            ? 'Havşalı'
            : newConfig.type === 'pyramid'
            ? 'Piramit'
            : 'Silindirik';
        desc = `Pim Geometrisi: ${typeLabel}`;
      } else {
        desc = 'Pim/Delik Ayarı Güncellendi';
      }
    }

    super({
      name: 'Pim / Bağlantı',
      description: desc,
      type: 'PIN_PLACEMENT',
      subType,
      isContinuous
    });

    this.previousConfig = clonePinConfig(previousConfig);
    this.newConfig = clonePinConfig(newConfig);
  }

  execute(context) {
    if (context.setPinConfig) {
      context.setPinConfig(this.newConfig);
    }
  }

  undo(context) {
    if (context.setPinConfig) {
      context.setPinConfig(this.previousConfig);
    }
  }

  canMergeWith(other) {
    if (!(other instanceof PinPlacementCommand)) return false;
    if (this.subType !== other.subType) return false;
    const isSlider =
      this.isContinuous ||
      other.isContinuous ||
      ['pin_diameter', 'pin_depth', 'pin_offset_u', 'pin_offset_v', 'pin_offset_both'].includes(this.subType);
    return isSlider && other.timestamp - this.timestamp < 1000;
  }

  merge(other) {
    this.newConfig = clonePinConfig(other.newConfig);
    this.description = other.description;
    this.timestamp = other.timestamp;
  }

  getDiffSummary() {
    if (this.subType === 'pin_offset_u' || this.subType === 'pin_offset_v' || this.subType === 'pin_offset_both') {
      const u = this.newConfig.offsetU?.toFixed(1) ?? '0.0';
      const v = this.newConfig.offsetV?.toFixed(1) ?? '0.0';
      return `U:${u > 0 ? '+' : ''}${u} mm, V:${v > 0 ? '+' : ''}${v} mm`;
    }
    if (this.subType === 'pin_diameter') {
      const prevD = this.previousConfig.diameter ?? this.previousConfig.size ?? 6;
      const newD = this.newConfig.diameter ?? this.newConfig.size ?? 6;
      return `Ø${prevD} mm → Ø${newD} mm`;
    }
    if (this.subType === 'pin_depth') {
      const prevDp = this.previousConfig.depth ?? this.previousConfig.height ?? 12;
      const newDp = this.newConfig.depth ?? this.newConfig.height ?? 12;
      return `${prevDp} mm → ${newDp} mm`;
    }
    if (this.subType === 'pin_clearance') {
      const prevC = this.previousConfig.clearance ?? 0.2;
      const newC = this.newConfig.clearance ?? 0.2;
      return `+${prevC.toFixed(2)} mm → +${newC.toFixed(2)} mm`;
    }
    return null;
  }
}

/**
 * SplitModelCommand - Tracks model cutting and joining operations.
 */
export class SplitModelCommand extends BaseCommand {
  constructor({
    previousSplitResult,
    newSplitResult,
    description = 'Model Kesildi',
    subType = 'split_plane'
  }) {
    super({
      name: 'Model Kesim',
      description,
      type: 'SPLIT_MODEL',
      subType
    });

    this.previousSplitResult = previousSplitResult;
    this.newSplitResult = newSplitResult;
  }

  execute(context) {
    if (context.setSplitResult) {
      context.setSplitResult(this.newSplitResult);
    }
    if (context.setShowPostCutBanner) {
      context.setShowPostCutBanner(!!this.newSplitResult);
    }
  }

  undo(context) {
    if (context.setSplitResult) {
      context.setSplitResult(this.previousSplitResult);
    }
    if (context.setShowPostCutBanner) {
      context.setShowPostCutBanner(!!this.previousSplitResult);
    }
  }

  getDiffSummary() {
    if (!this.newSplitResult) return 'Model Yeniden Birleştirildi';
    return this.subType === 'split_lasso' ? 'Serbest Kement Kesimi' : 'Düzlem Kesimi (2 Parça + Pim)';
  }
}

/**
 * MeasureCommand - Tracks 3D distance caliper measurements between Point A & Point B.
 */
export class MeasureCommand extends BaseCommand {
  constructor({
    previousMeasure,
    newMeasure,
    description = 'Ölçüm Yapıldı',
    subType = 'measure_points'
  }) {
    super({
      name: '3D Cetvel',
      description,
      type: 'MEASURE',
      subType
    });

    this.previousMeasure = {
      pointA: previousMeasure?.pointA ? previousMeasure.pointA.clone() : null,
      pointB: previousMeasure?.pointB ? previousMeasure.pointB.clone() : null,
      isMeasureActive: !!previousMeasure?.isMeasureActive
    };
    this.newMeasure = {
      pointA: newMeasure?.pointA ? newMeasure.pointA.clone() : null,
      pointB: newMeasure?.pointB ? newMeasure.pointB.clone() : null,
      isMeasureActive: !!newMeasure?.isMeasureActive
    };
  }

  execute(context) {
    if (context.setMeasurePointA) context.setMeasurePointA(this.newMeasure.pointA);
    if (context.setMeasurePointB) context.setMeasurePointB(this.newMeasure.pointB);
    if (context.setIsMeasureActive) context.setIsMeasureActive(this.newMeasure.isMeasureActive);
  }

  undo(context) {
    if (context.setMeasurePointA) context.setMeasurePointA(this.previousMeasure.pointA);
    if (context.setMeasurePointB) context.setMeasurePointB(this.previousMeasure.pointB);
    if (context.setIsMeasureActive) context.setIsMeasureActive(this.previousMeasure.isMeasureActive);
  }

  getDiffSummary() {
    if (this.newMeasure.pointA && this.newMeasure.pointB) {
      const dist = this.newMeasure.pointA.distanceTo(this.newMeasure.pointB);
      return `${dist.toFixed(2)} mm`;
    }
    return null;
  }
}

/**
 * InitialModelCommand - Represents the baseline imported model state.
 */
export class InitialModelCommand extends BaseCommand {
  constructor({ modelName, initialState }) {
    super({
      name: 'Model Yüklendi',
      description: `Model Yüklendi: ${modelName || 'STL Model'}`,
      type: 'MODEL_LOAD',
      subType: 'initial_state'
    });
    this.initialState = initialState;
  }

  execute(context) {
    // Baseline state is already active when loaded
  }

  undo(context) {
    if (!this.initialState) return;
    if (context.setModelRotation) context.setModelRotation(this.initialState.modelRotation || { x: 0, y: 0, z: 0 });
    if (context.setClippingConfig) context.setClippingConfig(this.initialState.clippingConfig);
    if (context.setPinConfig) context.setPinConfig(this.initialState.pinConfig || {});
    if (context.setSplitResult) context.setSplitResult(null);
    if (context.setShowPostCutBanner) context.setShowPostCutBanner(false);
    if (context.setMeasurePointA) context.setMeasurePointA(null);
    if (context.setMeasurePointB) context.setMeasurePointB(null);
    if (context.setDrawnPoints) context.setDrawnPoints([]);
    if (context.setIsLoopClosed) context.setIsLoopClosed(false);
  }

  getDiffSummary() {
    return 'Temel Durum';
  }
}

/**
 * CommandStack - The central invoker and undo/redo manager in the Command Pattern.
 * Manages the sequential command timeline, merging, step jumping, and change notifications.
 */
export class CommandStack {
  constructor({ maxHistory = 60, onStateChange = null } = {}) {
    this.commands = [];
    this.currentIndex = -1;
    this.maxHistory = maxHistory;
    this.onStateChange = onStateChange;
    this.isRestoring = false;
  }

  /**
   * Executes a command and appends it to the undo stack.
   * If the command can be merged with the last executed command (e.g. continuous slider drags),
   * it coalesces the changes into that command without cluttering the undo timeline.
   */
  execute(command, context) {
    if (this.isRestoring) return command;

    // Apply the forward mutation
    command.execute(context);

    // Check coalescing with the command currently at currentIndex
    if (this.currentIndex >= 0 && this.currentIndex < this.commands.length) {
      const lastCommand = this.commands[this.currentIndex];
      if (lastCommand && lastCommand.canMergeWith(command)) {
        lastCommand.merge(command);
        this.notifyChange();
        return lastCommand;
      }
    }

    // Branching: Discard any undone redo commands
    const truncated = this.commands.slice(0, this.currentIndex + 1);
    truncated.push(command);

    // Limit maximum history size
    if (truncated.length > this.maxHistory) {
      truncated.shift();
    }

    this.commands = truncated;
    this.currentIndex = this.commands.length - 1;

    this.notifyChange();
    return command;
  }

  /**
   * Undoes the command at the current index.
   */
  undo(context) {
    if (!this.canUndo()) return null;

    this.isRestoring = true;
    try {
      const command = this.commands[this.currentIndex];
      command.undo(context);
      this.currentIndex--;
      this.notifyChange();
      return command;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Redoes the next undone command.
   */
  redo(context) {
    if (!this.canRedo()) return null;

    this.isRestoring = true;
    try {
      this.currentIndex++;
      const command = this.commands[this.currentIndex];
      command.redo(context);
      this.notifyChange();
      return command;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Sequentially traverses the timeline to a specific step index.
   */
  jumpTo(targetIndex, context) {
    if (targetIndex < 0 || targetIndex >= this.commands.length || targetIndex === this.currentIndex) {
      return null;
    }

    this.isRestoring = true;
    try {
      if (targetIndex < this.currentIndex) {
        while (this.currentIndex > targetIndex) {
          this.commands[this.currentIndex].undo(context);
          this.currentIndex--;
        }
      } else {
        while (this.currentIndex < targetIndex) {
          this.currentIndex++;
          this.commands[this.currentIndex].redo(context);
        }
      }
      this.notifyChange();
      return this.commands[this.currentIndex];
    } finally {
      this.isRestoring = false;
    }
  }

  canUndo() {
    if (this.commands.length === 0) return false;
    if (this.commands[0]?.type === 'MODEL_LOAD') {
      return this.currentIndex > 0;
    }
    return this.currentIndex >= 0;
  }

  canRedo() {
    return this.currentIndex < this.commands.length - 1;
  }

  getUndoCommand() {
    return this.canUndo() && this.currentIndex >= 0 ? this.commands[this.currentIndex] : null;
  }

  getRedoCommand() {
    return this.canRedo() ? this.commands[this.currentIndex + 1] : null;
  }

  /**
   * Returns a serializable representation of commands for UI list rendering.
   */
  getHistoryList() {
    return this.commands.map((cmd, idx) => ({
      id: cmd.id,
      name: cmd.name,
      description: cmd.description,
      type: cmd.type,
      subType: cmd.subType,
      timestamp: cmd.timestamp,
      diffSummary: cmd.getDiffSummary ? cmd.getDiffSummary() : null,
      isCurrent: idx === this.currentIndex,
      isPast: idx < this.currentIndex,
      isFuture: idx > this.currentIndex
    }));
  }

  clear(initialCommand = null) {
    this.commands = initialCommand ? [initialCommand] : [];
    this.currentIndex = this.commands.length - 1;
    this.notifyChange();
  }

  notifyChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        commands: [...this.commands],
        currentIndex: this.currentIndex,
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        undoCommand: this.getUndoCommand(),
        redoCommand: this.getRedoCommand(),
        historyList: this.getHistoryList()
      });
    }
  }
}
