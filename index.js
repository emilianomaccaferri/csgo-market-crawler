const Crawler = require("./lib/Crawler");
var crawler = new Crawler({
  threads: 10, // 10 threads to spawn
  timeout: 20 // 20 seconds of delay between each request
});

crawler.start();

crawler.on('error', data => {

  console.log(`${data.thread_id} has reported an error: `);
  console.error(data.error);

})

crawler.on('message', msg => {

  if(msg.type === 'work_done') console.log(`thread #${msg.thread_id} has cached ${msg.results.length} more items`);
  if(msg.type === 'reset') console.log(`Resetting everything, we scanned all the market!`);

})
