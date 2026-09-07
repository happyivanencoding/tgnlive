# 真实阶段耗时

| 样本 | 已提交/目标 | 失败尝试 | 正文SSE中位秒 | 完成中位秒 | 完成p95/最大秒 | 规划回合秒 |
|---|---:|---:|---:|---:|---:|---|
| progression-baseline-stars-18-v070 | 18/18 | 0 | 5.971 | 21.182 | 58.065 | 9:32.402(complete) / 17:35.378(complete) |
| progression-treatment-stars-18-v080d | 18/18 | 2 | 6.929 | 25.438 | 74.057 | ?:34.457(failed) / ?:0.984(failed) / 9:33.512(complete) / 17:37.142(complete) |
| progression-browser-beast-18-v080d | 16/18 | 1 | 6.609 | 22.364 | 54.058 | 9:35.523(complete) / ?:120.008(failed) |
| progression-masked-18-v080f | 18/18 | 0 | 6.457 | 21.491 | 68.359 | 9:26.221(complete) / 17:24.231(complete) |
| progression-treatment-stars-18-v080a | 2/18 | 2 | 6.098 | 33.173 | 47.684 |  |
| progression-masked-18-v080b | 7/18 | 1 | 5.473 | 38.850 | 105.029 |  |
| progression-martial-18-v080e2 | 0/18 | 2 | — | — | — |  |

只在已提交请求内计算成功延迟；失败耗时见各样本 MEASUREMENTS.json。ACP 玩家思考独立计时；服务端 SSE 不等于浏览器可见帧；小样本p95不可外推。
