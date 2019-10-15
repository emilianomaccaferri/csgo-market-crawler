const { parentPort, workerData } = require("worker_threads");
var startingIndex = workerData.start,
    endingIndex = workerData.end,
    id = workerData.id,
    timeout = workerData.timeout * 1000 * id; // delay between requests (so the crawler doesn't incur in a 429 error)

const axios = require("axios");

var crawl = function(){

      axios.get(
        `https://steamcommunity.com/market/search/render/?query=&start=${startingIndex}&count=${endingIndex}&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=730&norender=1`
      )
      .then(res => {

        if(res.data.results.length == 0){

          /*

            the crawler has reached the latest page available,
            when no items are available it means that the range the crawler is exploring is empty because of the way steam's market api are developed

          */

          parentPort.postMessage({

            message: 'reset' // reset everything!!!

          })

          return;

        }

        var results = res.data.results.map(result => {

          if(result.asset_description.icon_url_large == "")
            result.asset_description.icon_url_large = result.asset_description.icon_url;

          var icon_url = `https://steamcommunity-a.akamaihd.net/economy/image/${result.asset_description.icon_url_large}`;

          return {
            name: result.name,
            hash_name: result.hash_name,
            icon_url,
            price: result.sell_price_text
          }

        })

        parentPort.postMessage({

          message: 'done',
          end: endingIndex,
          results,
          id

          // thread has found something

        })

      })

      .catch(err => {

        parentPort.postMessage({message: 'error', error: err, id})

      })

}

setTimeout(crawl, timeout);

parentPort.on('message', msg => {

  if(msg.type === 'new_work'){

    // reset everything and delay the restart

    startingIndex = msg.base + (id * 100);
    endingIndex = startingIndex + 100;
    setTimeout(crawl, timeout);

  }

})
