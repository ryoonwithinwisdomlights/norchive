import { BLOG } from "@/blog.config";
import SingleRecords from "@/components/records/SingleRecords";
import { getGlobalData } from "@/lib/notion/getNotionData";
import { getPost } from "@/lib/notion/getNotionPost";
import { getPostBlocks } from "@/lib/notion/notion";

/**
 * Get the list of recommended articles associated with the article, currently filtered based on tag relevance
 * @param post
 * @param {*} allPosts
 * @param {*} count
 * @returns
 */
function getRecommendPost(
  post: Post,
  allPosts: Post[],
  count: number = 6
): Post[] {
  let recommendPosts: Post[] = []; // 추천 게시물 배열
  const postIds: string[] = []; // 추천된 게시물 ID 배열
  const currentTags: string[] = post?.tags || []; // 현재 게시물의 태그
  for (let i = 0; i < allPosts.length; i++) {
    const p = allPosts[i];
    // 현재 게시물과 동일한 게시물이거나 타입이 'Post'가 아니면 건너뜀
    if (p.id === post.id || p.type.indexOf("Post") < 0) {
      continue;
    }

    for (let j = 0; j < currentTags.length; j++) {
      const t = currentTags[j];
      // 이미 추천된 게시물인지 확인getNotionPageData:
      if (postIds.indexOf(p.id) > -1) {
        continue;
      }
      // 태그가 일치하면 추천 게시물에 추가
      if (p.tags && p.tags.indexOf(t) > -1) {
        recommendPosts.push(p);
        postIds.push(p.id);
      }
    }
  }

  // 추천 게시물 개수를 제한
  if (recommendPosts.length > count) {
    recommendPosts = recommendPosts.slice(0, count);
  }
  return recommendPosts;
}

export async function generateStaticParams() {
  const records = [
    { recordId: "1341eb5c-0337-81ad-a46c-d94c8abcdada" },
    { recordId: "another-record-id" },
  ];
  return records.map((record) => ({
    recordId: record.recordId,
  }));
}

// `generateStaticParams`가 반환한 `params`를 사용하여 이 페이지의 여러 버전이 정적으로 생성됩니다.
export default async function Page({ params }) {
  const { recordId } = await params;

  if (!recordId) {
    return <div>Invalid record ID</div>;
  }
  const props = await getGlobalData({
    type: "Devproject",
    pageId: BLOG.NOTION_PAGE_ID,
    from: "Devproject",
  });

  // Find article in list
  props.post = props?.allPages?.find((item) => {
    return item.id === recordId;
  });

  // console.log(" props.post::", props.post);
  // Unable to retrieve article
  if (!props?.post) {
    props.post = null;
    return <div>Invalid record ID</div>;
  }
  if (props?.post) {
    const pageId = props?.post.slug.slice(-1)[0];
    if (pageId.length >= 32) {
      const post = await getPost(pageId);
      props.post = post;
    }
    // return <div>Invalid record ID</div>;
  }

  // Article content loading
  if (!props?.posts?.blockMap) {
    props.post.blockMap = await getPostBlocks(props.post.id, "Devproject");
  }

  // Recommended related article processing
  const allPosts = props?.allPages?.filter(
    (page) =>
      page.type !== "CONFIG" &&
      page.type !== "Menu" &&
      page.type !== "SubMenu" &&
      page.type !== "SubMenuPage" &&
      page.type !== "Notice" &&
      page.type !== "Page" &&
      page.status === "Published" &&
      page.type === "Devproject"
  );

  if (allPosts && allPosts.length > 0) {
    const index = allPosts.indexOf(props.post);
    props.prev = allPosts.slice(index - 1, index)[0] ?? allPosts.slice(-1)[0];
    props.next = allPosts.slice(index + 1, index + 2)[0] ?? allPosts[0];
    props.recommendPosts = getRecommendPost(
      props.post,
      allPosts,
      Number(BLOG.RECORD_RECOMMEND_COUNT)
    );
  } else {
    props.prev = null;
    props.next = null;
    props.recommendPosts = [];
  }

  return (
    <div className="w-full h-full">
      <SingleRecords props={props} />
    </div>
  );
}

interface Post {
  id: string;
  type: string;
  tags?: string[];
}
