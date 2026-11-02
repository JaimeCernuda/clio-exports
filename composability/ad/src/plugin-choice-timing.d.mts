export function pluginChoiceTiming(
  change: { at: number },
  copy: {
    addition: { leadFrames: number };
    chooser: {
      menuLeadFrames: number;
      selectBefore: number;
      dismissFrames: number;
    };
  },
): {
  enterAt: number;
  openAt: number;
  openClick: number;
  selectAt: number;
  selectClick: number;
  revealAt: number;
};
