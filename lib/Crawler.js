const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const redis = require("redis")

var items = [];

class Crawler extends EventEmitter{

  constructor(config){

    super(); // we can access EventEmitter methods as we did in index.js
    this.config = config;
    this.threadStatus = []; // where threads will put their status once they finished crawling
    this.threads = [];
    this.resetting = false;
    this.redis = redis.createClient(); // cache!

  }

  start(){

    for(var i = 0, threads = this.config.threads; i < threads; i++){

      const thread = new Worker(require.resolve('./autopilot.js'), {

        workerData: {start: i * 100, end: (i * 100) + 100, id: i, timeout: this.config.timeout}

      }) // instantiate a thread

      // i actually like this API

      this.threads.push(thread);

      thread.on('message', data => {

        switch(data.message){

          case 'done':

            this.threadStatus.push(data.end);

            /*

              The logic behind Steam's API is that items are searched between a range of indexes.
              for example, this crawler crawls 100 items per thread so that, every time a thread stops crawling, it will have reached a certain index corresponding an item.

              When a thread is spawned, an object containing the starting and the ending index is passed as an argument.
              The ending index of every thread is then pushed in this array because the crawler will then know where to start when every other thread has finished crawling:
              in fact, when all threads have finished working, they will calculate where to start and where to end.

              For example, with N threads spawned:

              thread#0:
                - start: 0
                - end: 100

              thread#1:
                - start: 100
                - end: 200

              thread#2:
                - start: 200
                - end: 300

              ...

              thread#N:
                - start: 100 * N
                - end: (100 * N) + 100

              When thread#N finishes working every other (N - 1) * 100 items will be already cached so that other threads don't have to re-scan them,
              so the crawler jumps directly to the lastest index that has been scanned so that threads can be reinitialized with the right indexes (following the same logic).


            */

            this.emit('message', {

              type: 'work_done',
              results: data.results,
              thread_id: data.id

            });

            data.results.forEach(result => {

              // communication for display
              this.redis.set(result.hash_name, `name:${result.name}]icon_url:${result.icon_url}]price:${result.price}`) // let's cache everything

            })

            if(this.threadStatus.length == this.config.threads){

              /*

                When all the threads have finished working (so when they all pushed their ending index in the array)
                the crawler will restart the threads from the highest index scanned

              */

              var max = Math.max(...this.threadStatus); // searching the maximum between the indexes
              this.threads.forEach(t => {

                t.postMessage({type: 'new_work', base: max}) // every thread is warned about the change of indexes

              })

              this.threadStatus = []; // clean everything

            }

          break;

          case 'reset':

          /*

            this happens when all the items in the market have been scanned
            the crawler then resets everything and starts from the beginning

          */

            if(this.resetting)
              break;

            this.resetting = true;

            this.threadStatus = [];
            this.emit('message', {

              type: 'reset'

            });
            this.threads.forEach(t => {

              t.postMessage({type: 'new_work', base: 0}) // every thread is warned about the change of indexes

            })

            this.resetting = false;

          break;

        }

        this.emit('message', {data, thread_id: i});

      })
      thread.on('error', (e) => this.emit('error', {error: e, thread_id: i}))
      thread.on('exit', (code) => this.emit('exit', {code, thread_id: i}))

    }

  }

}

module.exports = Crawler;
