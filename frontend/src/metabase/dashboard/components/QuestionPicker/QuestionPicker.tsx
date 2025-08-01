import { useMemo, useState } from "react";
import { t } from "ttag";
import _ from "underscore";

import { useListDatabasesQuery } from "metabase/api";
import { isPublicCollection } from "metabase/collections/utils";
import Breadcrumbs from "metabase/common/components/Breadcrumbs";
import Input from "metabase/common/components/Input";
import SelectList from "metabase/common/components/SelectList";
import type { BaseSelectListItemProps } from "metabase/common/components/SelectList/BaseSelectListItem";
import { useDebouncedValue } from "metabase/common/hooks/use-debounced-value";
import { useDashboardContext } from "metabase/dashboard/context";
import { getDashboard } from "metabase/dashboard/selectors";
import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import Collections, { ROOT_COLLECTION } from "metabase/entities/collections";
import { getCrumbs } from "metabase/lib/collections";
import { SEARCH_DEBOUNCE_DURATION } from "metabase/lib/constants";
import { connect, useDispatch, useSelector } from "metabase/lib/redux";
import { PLUGIN_COLLECTIONS } from "metabase/plugins";
import { getHasDataAccess, getHasNativeWrite } from "metabase/selectors/data";
import { Button, Flex, Icon, type IconProps } from "metabase/ui";
import type { Collection, CollectionId } from "metabase-types/api";

import { QuestionList } from "./QuestionList";
import S from "./QuestionPicker.module.css";
import { addDashboardQuestion } from "./actions";

interface QuestionPickerInnerProps {
  onSelect: BaseSelectListItemProps["onSelect"];
  collectionsById: Record<CollectionId, Collection>;
  getCollectionIcon: (collection: Collection) => IconProps;
}

function QuestionPickerInner({
  onSelect,
  collectionsById,
  getCollectionIcon,
}: QuestionPickerInnerProps) {
  const dispatch = useDispatch();
  const dashboard = useSelector(getDashboard);
  const dashboardCollection = dashboard?.collection ?? ROOT_COLLECTION;
  const [currentCollectionId, setCurrentCollectionId] = useState<CollectionId>(
    dashboardCollection.id,
  );
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(
    searchText,
    SEARCH_DEBOUNCE_DURATION,
  );

  const collection = collectionsById[currentCollectionId];
  const crumbs = getCrumbs(collection, collectionsById, setCurrentCollectionId);

  const handleSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => setSearchText(e.target.value);

  const allCollections = (collection && collection.children) || [];
  const showOnlyPublicCollections = isPublicCollection(dashboardCollection);
  const collections = showOnlyPublicCollections
    ? allCollections.filter(isPublicCollection)
    : allCollections;

  const { data } = useListDatabasesQuery();
  const databases = useMemo(() => data?.data ?? [], [data]);
  const hasDataAccess = useMemo(() => getHasDataAccess(databases), [databases]);
  const hasNativeWrite = useMemo(
    () => getHasNativeWrite(databases),
    [databases],
  );

  const { onNewQuestion } = useDashboardContext();
  const onNewNativeQuestion = () => dispatch(addDashboardQuestion("native"));
  return (
    <div className={S.questionPickerRoot}>
      <Input
        className={S.searchInput}
        fullWidth
        autoFocus
        data-autofocus
        placeholder={t`Search…`}
        value={searchText}
        onResetClick={() => setSearchText("")}
        onChange={handleSearchTextChange}
      />

      {(hasDataAccess || hasNativeWrite) && (
        <Flex gap="sm" mb="md" data-testid="new-button-bar">
          {hasDataAccess && (
            <Button
              variant="outline"
              className={S.newButton}
              leftSection={<Icon aria-hidden name="insight" />}
              onClick={onNewQuestion}
            >
              {t`New Question`}
            </Button>
          )}
          {hasNativeWrite && !isEmbeddingSdk() && (
            <Button
              variant="outline"
              className={S.newButton}
              leftSection={<Icon aria-hidden name="sql" />}
              onClick={onNewNativeQuestion}
            >
              {t`New SQL query`}
            </Button>
          )}
        </Flex>
      )}

      {!debouncedSearchText && (
        <>
          <div className={S.breadcrumbsWrapper}>
            <Breadcrumbs crumbs={crumbs} />
          </div>

          {collections.length > 0 && (
            <SelectList>
              {collections.map((collection) => {
                const icon = getCollectionIcon(collection);
                const iconColor = PLUGIN_COLLECTIONS.isRegularCollection(
                  collection,
                )
                  ? "text-light"
                  : icon.color;
                return (
                  <SelectList.Item
                    key={collection.id}
                    id={collection.id}
                    name={collection.name}
                    icon={{
                      ...icon,
                      color: iconColor,
                    }}
                    rightIcon="chevronright"
                    onSelect={(collectionId) =>
                      setCurrentCollectionId(collectionId as CollectionId)
                    }
                  />
                );
              })}
            </SelectList>
          )}
        </>
      )}

      <QuestionList
        hasCollections={collections.length > 0}
        searchText={debouncedSearchText}
        collectionId={currentCollectionId}
        onSelect={onSelect}
        showOnlyPublicCollections={showOnlyPublicCollections}
      />
    </div>
  );
}

export const QuestionPicker = _.compose(
  Collections.load({
    id: () => "root",
    entityType: "collections",
    loadingAndErrorWrapper: false,
  }),
  Collections.loadList({
    entityType: "collections",
    loadingAndErrorWrapper: false,
  }),
  connect((state, props: { entity: any /* collection entity instance */ }) => ({
    collectionsById: (
      props.entity || Collections
    ).selectors.getExpandedCollectionsById(state),
    getCollectionIcon: (props.entity || Collections).objectSelectors.getIcon,
  })),
)(QuestionPickerInner);
