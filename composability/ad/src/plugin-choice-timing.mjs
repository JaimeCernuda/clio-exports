/** One causal clock drives global plus, choice, dismissal and inserted plugin. */
export function pluginChoiceTiming(change, copy) {
  const openAt = change.at - copy.chooser.menuLeadFrames;
  const selectAt = change.at - copy.chooser.selectBefore;
  return {
    enterAt: change.at - copy.addition.leadFrames,
    openAt,
    openClick: openAt - 2,
    selectAt,
    selectClick: selectAt - 2,
    revealAt: selectAt + copy.chooser.dismissFrames,
  };
}
