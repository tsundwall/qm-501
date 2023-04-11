import { Event } from "../../quartermaster/src";

export class Request extends Event {
    assigned_services:number[] = []
    unassigned_services:number[] = []
    utility:number = Math.random()
    latency:number = Math.ceil(Math.random()*5) //uniform dist on interval 1,5
    latency_remaining:number = this.latency
    processing:boolean = false
    processing_count:number = 0
}