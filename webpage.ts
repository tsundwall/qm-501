import { TimedDependency, stageSummary, simulation, LRUCache, eventSummary, metronome, Event, Worker, ServiceQueue, WrappedStage, Timeout, Retry } from "C:/Users/Tanner/node_modules/@byu-se/quartermaster/dist";
import {FIFOServiceQueue, ResponsePayload, Stage} from "../dist";
// import {MathFunctions} from "../util";

const num_processes:number = 10

// class customQueue extends FIFOServiceQueue{
//
//     queue:Request[] = []
//     services:Services = {list:[]}
//
//     async enqueue(event: Request): Promise<Worker> {
//         return new Promise<Worker>((resolve, reject) => {
//             this.add(event)
//         })
//     }
//
//     async add(event:Request){
//         var request_list:Request[] = []
//
//         this.queue.push(event)
//         if (this.queue.length==this.getNumWorkers()){
//             //for (let queue_mem=0;queue_mem<this.queue.length;queue_mem++){
//             heuristic(this.getNumWorkers(),"MaxOverallServices",this.queue,this.services)
//                 request_list.push(this.queue[queue_mem])
//             //}
//             return request_list
//         }
//         else {
//             return "hi"
//         }
//     }
//
//     async assignWorker(service_list:Request[]){
//         const worker = new Worker(this)
//         return worker
//     }
// }

//
class Request extends Event {
    assigned_services:number[] = []
    utility:number = Math.random()
}
class Service extends TimedDependency {

    name:string = ""
    service_utility = Math.random()

}

type Services = {
    list: Service[]
}
//
class LoadBalancer extends Stage {

    constructor(protected wrapped: Stage[]) {
        super();
    }
    inQueue = new FIFOServiceQueue(1, 1)

    async workOn(event: Request): Promise<ResponsePayload> {

        for (let i = 0; i < event.assigned_services.length; i++) {

            const service_id:number = event.assigned_services[i]

            this.wrapped[service_id].accept(event);
            console.log(i)
        }
    }
}
export function init_services(num_services:number,rand_latencies:boolean=true,list_latencies:string[],list_names:string[]){

    var service_list:Services = {list:[]}

    for (let i = 0; i < num_services; i++){

        const new_service = new Service
        new_service.mean = Math.floor(Math.random() * 1000)
        new_service.service_utility = Math.floor(Math.random() * 1000)
        service_list.list.push(new_service)


        //console.log(new_process.mean)
    }
    return service_list
}

const new_process = new TimedDependency




async function work() {
    const events = await simulation.run(new_process, 160000);
    console.log("done");
    stageSummary([new_process])
    eventSummary(events);
    //stats.summary();
}


//var lb = new LoadBalancer(process_list.list)


//work()
var services = init_services(200,true,[],[])
function heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services) {
    if (heuristic == "MaxOverallServices"){

        const num_full_services = Math.floor(num_workers / requests.length)
        const partial_service_tot = num_workers % requests.length
        var all_service_utilities = []
        var allocated_service_utilities = []

        for (let i = 0;i < services.list.length;i++) {
            all_service_utilities.push(services.list[i].service_utility)
        }

        for (let i = 0;i < num_full_services;i++){
            var max = Math.max(...all_service_utilities)
            var index = all_service_utilities.indexOf(max)
            allocated_service_utilities.push(index)
            if (index !== -1) {
                all_service_utilities.splice(index, 1);
            }
        }

        for (let i = 0;i < requests.length;i++) {
            requests[i].assigned_services.push(...allocated_service_utilities)

        }
        var last_best_service = all_service_utilities.indexOf(Math.max(...all_service_utilities))

        for (let i = 0;i < partial_service_tot;i++) {
            requests[i].assigned_services.push(last_best_service)
        }

    }

    //elif (heuristic == "MaxOverall"){}

}

function gen_reqs(num:number){

    var list:Request[] = []

    for (let i = 0; i < num;i++){
        var rand = Math.random()
        var req = new Request(rand.toString())
        list.push(req)
    }
    return list
}
var reqs = gen_reqs(100)

heuristic(1030,"MaxOverallServices",reqs,services)

console.log(reqs[1].assigned_services)
console.log(reqs[99].assigned_services)
//queue
//load balancer
//set of processes

