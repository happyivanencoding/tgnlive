# 真实阶段耗时

| 样本 | 已提交/目标 | 失败尝试 | 正文SSE中位秒 | 完成中位秒 | 完成p95/最大秒 | 规划回合秒 |
|---|---:|---:|---:|---:|---:|---|
| ascension-baseline-hunt-20-v080-r2 | 20/20 | 4 | 6.553 | 23.924 | 51.462 | 9:26.016(complete) / 17:42.015(complete) |
| ascension-baseline-martial-20-v080-r2 | 20/20 | 0 | 4.981 | 20.331 | 45.600 | 9:22.210(complete) / 17:24.186(complete) |
| ascension-a-hunt-20-r3 | 20/20 | 6 | 6.193 | 21.921 | 48.270 | 9:47.074(complete) / 17:27.315(complete) |
| ascension-a-beast-20-r3 | 20/20 | 6 | 9.114 | 25.616 | 51.557 | 9:123.028(failed) / 9:20.007(failed) / 9:27.944(complete) / 17:30.465(complete) |
| ascension-b-hunt-20 | 20/20 | 0 | 11.588 | 24.361 | 60.269 | 9:35.935(complete) / 17:79.011(complete) |
| ascension-b-martial-20 | 20/20 | 0 | 7.463 | 23.766 | 52.112 | 9:49.606(complete) / 17:31.698(complete) |
| ascension-c-beast-browser-20-r2 | 20/20 | 1 | 11.688 | 26.216 | 34.974 |  |
| ascension-d-masked-20 | 20/20 | 0 | 9.290 | 22.186 | 55.674 | 9:39.928(complete) / 17:40.006(complete) |
| ascension-e-masked-20 | 20/20 | 0 | 11.623 | 26.840 | 41.836 |  |
| ascension-c-stars-20-r2 | 20/20 | 0 | 12.895 | 28.924 | 43.462 |  |

只在已提交请求内计算成功延迟；失败耗时见各样本 MEASUREMENTS.json。ACP 玩家思考独立计时；服务端 SSE 不等于浏览器可见帧；小样本p95不可外推。
