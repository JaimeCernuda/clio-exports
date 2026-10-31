import { createContext, useContext, useLayoutEffect } from "react";
export interface EngineeringModel {
  dataModel: {
    get: (path: string) => unknown;
    set: (path: string, value: unknown) => unknown;
  };
  id: string;
}
export const EngineeringControls = createContext<{
  values?: Readonly<Record<string, unknown>>;
}>({});
export const engineeringModels = new Map<string, EngineeringModel>();
/** Write native A2UI bindings; readers in manual mode keep fully working controls. */
export function useEngineeringModel(model: EngineeringModel | undefined): void {
  const { values } = useContext(EngineeringControls);
  useLayoutEffect(() => {
    if (!model) return;
    engineeringModels.set(model.id, model);
    return () => {
      if (engineeringModels.get(model.id) === model)
        engineeringModels.delete(model.id);
    };
  }, [model]);
  useLayoutEffect(() => {
    if (!model) return;
    if (values)
      for (const [path, value] of Object.entries(values)) {
        if (JSON.stringify(model.dataModel.get(path)) !== JSON.stringify(value))
          model.dataModel.set(path, value);
      }
  }, [model, values]);
}
