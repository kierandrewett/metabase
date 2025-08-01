import { useCallback } from "react";

import { useLogRecentItemMutation } from "metabase/api";
import { isLoggableActivityModel } from "metabase-types/api";

import type { CollectionPickerItem } from "../../Pickers/CollectionPicker";
import type { DataPickerValueItem } from "../../Pickers/DataPicker";

export const useLogRecentItem = () => {
  const [logRecentItem] = useLogRecentItemMutation();

  const tryLogRecentItem = useCallback(
    (item: CollectionPickerItem | DataPickerValueItem) => {
      if (isLoggableActivityModel(item)) {
        logRecentItem({
          model_id: item.id,
          model: item.model,
        });
      }
    },
    [logRecentItem],
  );

  return {
    tryLogRecentItem,
  };
};
