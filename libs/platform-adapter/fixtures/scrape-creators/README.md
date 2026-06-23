# ScrapeCreators video API fixtures

Sample JSON responses from the endpoints used by `getVideo()` in `scrape-creators.ts`.
Refresh with:

```bash
node libs/platform-adapter/scripts/fetch-video-fixtures.mjs
```

Requires `SCRAPECREATORS_API_KEY` in the environment (or root `.env` via dotenv).

## Endpoints & field mapping

| Platform  | Endpoint              | Views              | Title/caption        | Likes              | Comments           | Owner              | Thumbnail                    |
|-----------|-----------------------|--------------------|----------------------|--------------------|--------------------|--------------------|------------------------------|
| TikTok    | `GET /v2/tiktok/video` | `aweme_detail.statistics.play_count` | `aweme_detail.desc` | `statistics.digg_count` | `statistics.comment_count` | `author.unique_id` | `video.cover.url_list[0]`    |
| YouTube   | `GET /v1/youtube/video` | `viewCountInt`     | `title`              | `likeCountInt`     | `commentCountInt`  | `channel.handle`   | first `watchNextVideos[].thumbnail` or adapter uses `thumbnail` if present |
| Instagram | `GET /v1/instagram/post` | `xdt_shortcode_media.video_view_count` | `edge_media_to_caption.edges[0].node.text` | `edge_media_preview_like.count` | `edge_media_to_parent_comment.count` | `owner.username` | `thumbnail_src` / `display_url` |
| Twitter   | `GET /v1/twitter/tweet` | `views.count`      | `legacy.full_text`   | `legacy.favorite_count` | `legacy.reply_count` | `core.user_results.result.core.screen_name` (legacy: `user.screen_name`) | `legacy.entities.media[].media_url_https` |
