/**
 * 京东评论收集脚本
 * 用法: playwright-cli run-code --filename=collect_reviews.js
 *
 * 前提：评论弹层已打开（点击"全部评价"后）
 * 原理：京东评论弹层使用虚拟滚动，DOM 只渲染可见区域的少量节点，
 *       需要边滚动边收集，用 Map 去重，直到收集到目标数量。
 * 结果：存入 window.__reviews__（JSON 字符串），供后续 eval 取出
 */
async page => {
  const TARGET = 100;
  const allReviews = new Map();

  // 先滚回顶部
  await page.evaluate(() => {
    const c = document.querySelector('[class*=_rateListContainer]');
    if (c) c.scrollTop = 0;
  });
  await page.waitForTimeout(1000);

  for (let i = 0; i < 80; i++) {
    const reviews = await page.evaluate(() => {
      return [...document.querySelectorAll('.jdc-pc-rate-card')].map(el => ({
        user: el.querySelector('.jdc-pc-rate-card-nick')?.textContent?.trim() || '',
        content: el.querySelector('.jdc-pc-rate-card-main-desc')?.textContent?.trim().replace(/\n/g, ' ') || '',
        date: el.querySelector('.date.list')?.textContent?.trim() || '',
        spec: el.querySelector('.jdc-pc-rate-card-info .info')?.textContent?.trim() || ''
      })).filter(r => r.content);
    });

    let newCount = 0;
    reviews.forEach(r => {
      const key = r.user + '|' + r.content.slice(0, 40);
      if (!allReviews.has(key)) { allReviews.set(key, r); newCount++; }
    });

    console.log(`scroll ${i}: visible=${reviews.length}, new=${newCount}, total=${allReviews.size}`);

    if (allReviews.size >= TARGET) break;

    // 检查是否已到底
    const atBottom = await page.evaluate(() => {
      const c = document.querySelector('[class*=_rateListContainer]');
      if (!c) return true;
      c.scrollTop += 1500;
      return c.scrollTop + c.clientHeight >= c.scrollHeight - 10;
    });

    await page.waitForTimeout(1500);
    if (atBottom && newCount === 0) { console.log('reached bottom'); break; }
  }

  const result = JSON.stringify([...allReviews.values()].slice(0, TARGET));
  await page.evaluate(data => { window.__reviews__ = data; }, result);
  console.log(`done: collected ${allReviews.size} reviews`);
}
