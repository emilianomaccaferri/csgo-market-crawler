const Crawler = require("./lib/Crawler");
var crawler = new Crawler({
  threads: 10, // 10 threads to spawn
  timeout: 60 // 60 seconds of delay between each request
});

console.log("we be crawlin' down here");

crawler.start();

crawler.on('error', data => {

  console.log(`${data.id} has reported an error: `);
  console.log(data.error);

})

crawler.on('message', msg => {

  if(msg.type === 'work_done') console.log(`Oh well, thread #${msg.thread_id} has cached ${msg.results.length} more items!`);
  if(msg.type === 'reset') console.log(`Resetting everything, we scanned all the market!`);

})
