/* eslint-disable no-unused-vars */
import { getDataFromCache, setDataToCache } from "@/lib/cache/cache_manager";
import { BLOG } from "@/blog.config";
import { getPostBlocks } from "@/lib/notion/getPostBlocks";
import { idToUuid } from "notion-utils";
import { deepClone } from "../utils/utils";
import { getAllCategories } from "./getAllCategories";
import getAllPageIds from "./getAllPageIds";
import { getAllTags } from "./getAllTags";
import getPageProperties from "@/lib/notion/getPageProperties";
import { compressImage, mapImgUrl } from "./mapImage";
import getOnlyPageIdProperties from "@/lib/notion/getPageProperties";
/**
 * Get blog data
 * @param {*} pageId
 * @param {*} from
 * @param latestPostCount Capture the latest number of articles
 * @param categoryCount
 * @param tagsCount Number of intercepted tags
 * @param pageType Filtered article types, array format ['Page','Post']
 * @returns
 *
 */
export async function getCustomedGlobalData({
  pageId = BLOG.NOTION_PAGE_ID,
  from,
}) {
  // Get from notice
  const data = await getNotionPageData({ pageId, from });
  const db = deepClone(data);
  // Sensitive data not returned
  delete db.block;
  delete db.schema;
  delete db.rawMetadata;
  delete db.pageIds;
  delete db.viewIds;
  delete db.collection;
  delete db.collectionQuery;
  delete db.collectionId;
  delete db.collectionView;
  return db;
}

/**
 * Get blog data
 * @param {*} pageId
 * @param {*} from
 * @param latestPostCount Capture the latest number of articles
 * @param categoryCount
 * @param tagsCount Number of intercepted tags
 * @param pageType Filtered article types, array format ['Page','Post']
 * @returns
 *
 */
export async function getGlobalPageIdData({
  pageId = BLOG.NOTION_PAGE_ID,
  from,
}) {
  // Get from notice
  console.log(
    `[getGlobalPageIdData pageId]\n pageId:${pageId} \n -from:${from}`
  );

  const data = await getDataBasePageIdsByNotionAPI({ pageId, from });
  const db = deepClone(data);
  // Sensitive data not returned
  delete db.block;
  delete db.schema;
  delete db.rawMetadata;
  delete db.pageIds;
  delete db.viewIds;
  delete db.collection;
  delete db.collectionQuery;
  delete db.collectionId;
  delete db.collectionView;
  return db;
}

/**
 * Get blog data
 * @param {*} pageId
 * @param {*} from
 * @param latestPostCount Capture the latest number of articles
 * @param categoryCount
 * @param tagsCount Number of intercepted tags
 * @param pageType Filtered article types, array format ['Page','Post']
 * @returns
 *
 */
export async function getGlobalData({
  pageId = BLOG.NOTION_PAGE_ID,
  type = "Record",
  from,
}) {
  // Get from notice
  console.log(
    `[getGlobalData pageId]\n pageId:${pageId} \n -from:${from} \n -type:${type}`
  );
  const data = await getNotionPageData({ pageId, from, type });
  const db = deepClone(data);
  // Sensitive data not returned
  delete db.block;
  delete db.schema;
  delete db.rawMetadata;
  delete db.pageIds;
  delete db.viewIds;
  delete db.collection;
  delete db.collectionQuery;
  delete db.collectionId;
  delete db.collectionView;
  // console.log('db==', db)
  return db;
}

/**
 * Get the latest articles and sort them in descending order
 * according to the last modified time
 * @param {*}} param0
 * @returns
 */
function getLatestPosts({ allPages, from, latestPostCount }) {
  const allPosts = allPages?.filter(
    (page) =>
      page.type !== "CONFIG" &&
      page.type !== "Menu" &&
      page.type !== "SubMenu" &&
      page.type !== "SubMenuPage" &&
      page.type !== "Notice" &&
      page.type !== "Page" &&
      page.status === "Published"
  );

  const latestPosts = Object.create(allPosts).sort((a, b) => {
    const dateA = new Date(a?.lastEditedDate || a?.publishDate);
    const dateB = new Date(b?.lastEditedDate || b?.publishDate);
    return dateB - dateA;
  });
  return latestPosts.slice(0, latestPostCount);
}

/**
 *
Get the collection data of the specified notification
 * @param pageId
 * @param from request source
 * @returns {Promise<JSX.Element|*|*[]>}
 */
export async function getNotionPageData({ type = "Record", pageId, from }) {
  // Try to get from cachec
  // console.log("getNotionPageData: pageId:", pageId);
  const cacheKey = "page_block_" + pageId;
  let data = await getDataFromCache(cacheKey);
  if (data && data.pageIds?.length > 0) {
    return data;
  }
  data = await getDataBaseInfoByNotionAPI({ pageId, from, type });
  // cache
  if (data) {
    await setDataToCache(cacheKey, data);
  }

  return data;
}

/**
 *
Get the collection data of the specified notification
 * @param pageId
 * @param from request source
 * @returns {Promise<JSX.Element|*|*[]>}
 */
export async function getNotionPageDataForOne({
  type = "Record",
  pageId,
  recordId,
  from,
}) {
  // Try to get from cachec
  console.log("getNotionPageDataForOne: pageId:", pageId);
  const cacheKey = "page_block_" + pageId;
  let data = await getDataFromCache(cacheKey);
  if (data && data.pageIds?.length > 0) {
    return data;
  }
  data = await getDataBaseInfoByNotionAPIForOne({
    pageId,
    from,
    recordId,
    type,
  });
  // cache
  if (data) {
    await setDataToCache(cacheKey, data);
  }
  return data;
}

/**
 * Get user-defined single-page menu
 * @param notionPageData
 * @returns {Promise<[]|*[]>}
 */
function getCustomNav({ allPages }) {
  const customNav = [];
  if (allPages && allPages.length > 0) {
    allPages.forEach((p) => {
      if (p?.slug?.indexOf("http") === 0) {
        customNav.push({
          icon: p.icon || null,
          name: p.title,
          to: p.slug,
          target: "_blank",
          show: true,
        });
      } else {
        customNav.push({
          icon: p.icon || null,
          name: p.title,
          to: "/" + p.slug,
          target: "_self",
          show: true,
        });
      }
    });
  }
  return customNav;
}

/**
 * Get custom menu
 * @param {*} allPages
 * @returns
 */
function getCustomMenu({ collectionData }) {
  const menuPages = collectionData.filter(
    (post) =>
      (post?.type === BLOG.NOTION_PROPERTY_NAME.type_menu ||
        post?.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu ||
        post?.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu_page) &&
      post.status === "Published"
  );
  const menus = [];
  if (menuPages && menuPages.length > 0) {
    menuPages.forEach((e) => {
      e.show = true;
      if (e?.slug?.indexOf("http") === 0) {
        e.target = "_blank";
      }
      if (e.type === BLOG.NOTION_PROPERTY_NAME.type_menu) {
        menus.push(e);
      } else if (
        e.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu ||
        e.type === BLOG.NOTION_PROPERTY_NAME.type_sub_menu_page
      ) {
        const parentMenu = menus[menus.length - 1];
        if (parentMenu) {
          if (parentMenu.subMenus) {
            parentMenu.subMenus.push(e);
          } else {
            parentMenu.subMenus = [e];
          }
        }
      }
    });
  }
  return menus;
}

/**
 * Get label options
 * @param schema
 * @returns {undefined}
 */
function getTagOptions(schema) {
  if (!schema) return {};
  const tagSchema = Object.values(schema).find(
    (e) => e.name === BLOG.NOTION_PROPERTY_NAME.tags
  );
  return tagSchema?.options || [];
}

/**
 * Get classification options
 * @param schema
 * @returns {{}|*|*[]}
 */
function getCategoryOptions(schema) {
  if (!schema) return {};
  const categorySchema = Object.values(schema).find(
    (e) => e.name === BLOG.NOTION_PROPERTY_NAME.category
  );
  return categorySchema?.options || [];
}

/**
 * Site Information
 * @param notionPageData
 * @param from
 * @returns {Promise<{title,description,pageCover,icon}>}
 */
/**
 * Site Information
 * @param notionPageData
 * @param from
 * @returns {Promise<{title,description,pageCover,icon}>}
 */
function getSiteInfo({ collection, block, NOTION_CONFIG }) {
  const defaultTitle = NOTION_CONFIG?.TITLE || BLOG.TITLE;
  const defaultDescription = NOTION_CONFIG?.DESCRIPTION || BLOG.DESCRIPTION;
  const defaultPageCover =
    NOTION_CONFIG?.HOME_BANNER_IMAGE || BLOG.HOME_BANNER_IMAGE;
  const defaultIcon = NOTION_CONFIG?.AVATAR || BLOG.AVATAR;
  const defaultLink = NOTION_CONFIG?.LINK || BLOG.LINK;
  if (!collection && !block) {
    return {
      title: defaultTitle,
      description: defaultDescription,
      pageCover: defaultPageCover,
      icon: defaultIcon,
      link: defaultLink,
    };
  }

  const title = collection?.name?.[0][0] || defaultTitle;
  const description = collection?.description
    ? Object.assign(collection).description[0][0]
    : defaultDescription;

  const pageCover = collection?.cover
    ? mapImgUrl(collection?.cover, collection, "collection")
    : defaultPageCover;

  // Compress all category user avatars
  let icon = compressImage(
    collection?.icon
      ? mapImgUrl(collection?.icon, collection, "collection")
      : defaultIcon
  );
  // Site URL
  const link = NOTION_CONFIG?.LINK || defaultLink;

  // Site icon cannot be emoji
  const emojiPattern = /\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g;
  if (!icon || emojiPattern.test(icon)) {
    icon = defaultIcon;
  }
  return { title, description, pageCover, icon, link };
}

/**
 * Get a reduced list of articles for navigation
 * Used in the gitbook theme, only the title, classification, label and classification information
of the article are retained, and the summary, password, date and other data are reduced.
 * The conditions for navigation page must be Posts
 * @param {*} param0
 */
export function getNavPagesForGitBook({ allPages }) {
  const allNavPages = allPages?.filter((post) => {
    return (
      post &&
      post?.slug &&
      !post?.slug?.startsWith("http") &&
      post?.type !== "CONFIG" &&
      post?.type !== "Menu" &&
      post?.type !== "SubMenu" &&
      post?.type !== "SubMenuPage" &&
      post?.type !== "Notice" &&
      post?.type !== "Page" &&
      post?.status === "Published"
    );
  });

  return allNavPages.map((item) => ({
    id: item.id,
    title: item.title || "",
    pageCoverThumbnail: item.pageCoverThumbnail || "",
    category: item.category || null,
    tags: item.tags || null,
    summary: item.summary || null,
    slug: item.slug,
    pageIcon: item.pageIcon || "",
    lastEditedDate: item.lastEditedDate,
    type: item.type | "",
  }));
}

/**
 * Get a reduced list of articles for navigation
 * Used in the gitbook theme, only the title, classification, label and classification information
of the article are retained, and the summary, password, date and other data are reduced.
 * The conditions for navigation page must be Posts
 * @param {*} param0
 */
export function getNavPages({ allPages }) {
  const allNavPages = allPages?.filter((post) => {
    return (
      post &&
      post?.slug &&
      !post?.slug?.startsWith("http") &&
      post?.type !== "CONFIG" &&
      post?.type !== "Menu" &&
      post?.type !== "SubMenu" &&
      post?.type !== "SubMenuPage" &&
      post?.type !== "Notice" &&
      post?.type !== "Page" &&
      post?.status === "Published"
    );
  });

  return allNavPages.map((item) => ({
    id: item.id,
    title: item.title || "",
    pageCoverThumbnail: item.pageCoverThumbnail || "",
    category: item.category || null,
    tags: item.tags || null,
    summary: item.summary || null,
    slug: item.slug,
    pageIcon: item.pageIcon || "",
    lastEditedDate: item.lastEditedDate,
    type: item.type | "",
  }));
}

/**
 * Get announcements
 */
async function getNotice(post) {
  if (!post) {
    return null;
  }

  post.blockMap = await getPostBlocks(post.id, "data-notice");
  return post;
}

// Return when there is no data
const EmptyData = (pageId) => {
  const empty = {
    notice: null,
    siteInfo: getSiteInfo({}),
    allPages: [
      {
        id: 1,
        title: `Unable to get Notion data，Please check Notion_ID： \n current ${pageId}`,
        summary: " ",
        status: "Published",
        type: "Post",
        slug: "13a171332816461db29d50e9f575b00d",
        date: {
          start_date: "2024-11-24",
          lastEditedDay: "2024-12-10",
          tagItems: [],
        },
      },
    ],
    allNavPages: [],
    collection: [],
    collectionQuery: {},
    collectionId: null,
    collectionView: {},
    viewIds: [],
    block: {},
    schema: {},
    tagOptions: [],
    categoryOptions: [],
    rawMetadata: {},
    customNav: [],
    customMenu: [],
    postCount: 1,
    pageIds: [],
    latestPosts: [],
  };
  return empty;
};

/**
 * Call NotionAPI to obtain Only Page "id" data
 * @returns {Promise<JSX.Element|null|*>}
 */
async function getDataBasePageIdsByNotionAPI({ pageId, from }) {
  const pageRecordMap = await getPostBlocks(pageId, from);
  if (!pageRecordMap) {
    console.error("can`t get Notion Data ; Which id is: ", pageId);
    return {};
  }

  pageId = idToUuid(pageId);
  const block = pageRecordMap.block || {};
  const rawMetadata = block[pageId]?.value;
  // Check Type Page-Database and Inline-Database
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    console.error(`pageId "${pageId}" is not a database`);
    return EmptyData(pageId);
  }
  const collection = Object.values(pageRecordMap.collection)[0]?.value || {};
  const collectionId = rawMetadata?.collection_id;
  const collectionQuery = pageRecordMap.collection_query;
  const collectionView = pageRecordMap.collection_view;

  const viewIds = rawMetadata?.view_ids;
  const collectionData = [];
  const pageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds
  );
  if (pageIds?.length === 0) {
    console.error(
      "The obtained article list is empty, please check the notification template",
      collectionQuery,
      collection,
      collectionView,
      viewIds,
      pageRecordMap
    );
  }
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i];
    const value = block[id]?.value;
    if (!value) {
      continue;
    }
    const properties = (await getOnlyPageIdProperties(id, block)) || null;
    if (properties) {
      if (
        properties.type !== "CONFIG" &&
        properties.type !== "Menu" &&
        properties.type !== "SubMenu" &&
        properties.type !== "SubMenuPage" &&
        properties.type !== "Notice" &&
        properties.type !== "Page" &&
        properties.status === "Published"
      ) {
        collectionData.push(properties);
      }
    }
  }

  return {
    collectionData,
  };
}

/**
 * Call NotionAPI to obtain Page data
 * @returns {Promise<JSX.Element|null|*>}
 */
async function getDataBaseInfoByNotionAPI({ pageId, from, type = "Record" }) {
  const pageRecordMap = await getPostBlocks(pageId, from);
  if (!pageRecordMap) {
    console.error("can`t get Notion Data ; Which id is: ", pageId);
    return {};
  }

  pageId = idToUuid(pageId);
  const block = pageRecordMap.block || {};
  const rawMetadata = block[pageId]?.value;
  // Check Type Page-Database and Inline-Database
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    console.error(`pageId "${pageId}" is not a database`);
    return EmptyData(pageId);
  }
  const collection = Object.values(pageRecordMap.collection)[0]?.value || {};
  const siteInfo = getSiteInfo({ collection, block });
  const collectionId = rawMetadata?.collection_id;
  const collectionQuery = pageRecordMap.collection_query;
  const collectionView = pageRecordMap.collection_view;
  const signedUrls = pageRecordMap.signed_urls;
  const previewImages = pageRecordMap.preview_images;
  const schema = collection?.schema;

  const viewIds = rawMetadata?.view_ids;
  const collectionData = [];
  const pageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds
  );
  if (pageIds?.length === 0) {
    console.error(
      "The obtained article list is empty, please check the notification template",
      collectionQuery,
      collection,
      collectionView,
      viewIds,
      pageRecordMap
    );
  }
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i];
    const value = block[id]?.value;
    if (!value) {
      continue;
    }
    const properties =
      (await getPageProperties(
        id,
        block,
        schema,
        null,
        getTagOptions(schema)
      )) || null;
    if (properties) {
      collectionData.push(properties);
    }
  }

  // article count
  let postCount = 0;

  // Find all Posts and Pages
  const allPages = collectionData.filter((post) => {
    if (type === "Record") {
      if (post?.type === "Record" && post.status === "Published") {
        postCount++;
      }
    } else if (type === "Devproject") {
      if (post?.type === "Devproject" && post.status === "Published") {
        postCount++;
      }
    } else if (type === "Engineering") {
      if (post?.type === "Engineering" && post.status === "Published") {
        postCount++;
      }
    } else if (type === "GuestBook") {
      if (post?.type === "GuestBook" && post.status === "Published") {
        postCount++;
      }
    } else if (type === "Page") {
      if (post?.type === "GuestBook" && post.status === "Published") {
        postCount++;
      }
    } else {
      postCount++;
    }
    return (
      post &&
      post?.slug &&
      !post?.slug?.startsWith("http") &&
      (post?.status === "Invisible" || post?.status === "Published")
    );
  });

  // console.log('allPages', allPages)
  // Sort by date
  if (BLOG.RECORDS_SORT_BY === "date") {
    allPages.sort((a, b) => {
      return b?.publishDate - a?.publishDate;
    });
  }

  const notice = await getNotice(
    collectionData.filter((post) => {
      return (
        post &&
        post?.type &&
        post?.type === "Notice" &&
        post.status === "Published"
      );
    })?.[0]
  );

  const categoryOptions = getAllCategories({
    allPages,
    categoryOptions: getCategoryOptions(schema),
  });

  // getsSubTypeOptions
  const tagOptions = getAllTags({
    allPages,
    tagOptions: getTagOptions(schema),
  });

  // old menu
  const customNav = getCustomNav({
    allPages: collectionData.filter(
      (post) => post?.type === "Page" && post.status === "Published"
    ),
  });
  // new menu
  const customMenu = await getCustomMenu({ collectionData });
  const latestPosts = getLatestPosts({ allPages, from, latestPostCount: 6 });
  const allNavPages = getNavPages({ allPages });
  const allNavPagesForGitBook = getNavPagesForGitBook({ allPages });
  return {
    notice,
    siteInfo,
    allPages,
    allNavPages,
    allNavPagesForGitBook,
    collection,
    collectionQuery,
    collectionId,
    collectionView,
    viewIds,
    block,
    schema,
    tagOptions,
    categoryOptions,
    rawMetadata,
    customNav,
    customMenu,
    postCount,
    pageIds,
    latestPosts,
    signedUrls,
    previewImages,
  };
}

/**
 * Call NotionAPI to obtain Page data
 * @returns {Promise<JSX.Element|null|*>}
 */
async function getDataBaseInfoByNotionAPIForOne({
  pageId,
  recordId,
  from,
  type = "Record",
}) {
  console.log(
    `getDataBaseInfoByNotionAPIForOne \n- pageId: ${pageId},recordId:${recordId},from: ${from},type: ${type}, `
  );
  const pageRecordMap = await getPostBlocks(pageId, from);
  if (!pageRecordMap) {
    console.error("can`t get Notion Data ; Which id is: ", pageId);
    return {};
  }
  pageId = idToUuid(pageId);
  const block = pageRecordMap.block || {};
  const rawMetadata = block[pageId]?.value;
  // Check Type Page-Database and Inline-Database
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    console.log(`pageId "${pageId}" is not a database`);
    return EmptyData(pageId);
  }
  const collection = Object.values(pageRecordMap.collection)[0]?.value || {};
  const collectionId = rawMetadata?.collection_id;
  const collectionQuery = pageRecordMap.collection_query;
  const collectionView = pageRecordMap.collection_view;
  const schema = collection?.schema;

  const viewIds = rawMetadata?.view_ids;
  const collectionData = [];
  const pageIds = getAllPageIds(
    collectionQuery,
    collectionId,
    collectionView,
    viewIds
  );
  if (pageIds?.length === 0) {
    console.error(
      "The obtained article list is empty, please check the notification template",
      collectionQuery,
      collection,
      collectionView,
      viewIds,
      pageRecordMap
    );
  }
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i];
    const value = block[id]?.value;
    if (!value) {
      continue;
    }
    const properties =
      (await getPageProperties(
        id,
        block,
        schema,
        null,
        getTagOptions(schema)
        // getCategoryOptions(schema),
      )) || null;
    if (properties) {
      // console.log('properties:', properties)
      collectionData.push(properties);
    }
  }

  // article count
  let postCount = 0;

  // 노션전체 포스트들 Find all Posts and Pages
  const allPages = collectionData.filter((post) => {
    if (post?.type === type && post.status === "Published") {
      if (post?.id === recordId) {
        // console.log(`${type} record-item: \n`, post);
      }
      postCount++;
    }

    return (
      post &&
      post?.slug &&
      post?.type === type &&
      // post?.id === recordId &&
      !post?.slug?.startsWith("http") &&
      post.status === "Published"
    );
  });

  // Sort by date
  if (BLOG.RECORDS_SORT_BY === "date") {
    allPages.sort((a, b) => {
      return b?.publishDate - a?.publishDate;
    });
  }

  return {
    allPages,
    postCount,
  };
}
