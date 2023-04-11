import { Request, Service } from "../resources";

export type Services = {
    list: Service[]
}

export abstract class WebpageBase {

    protected service_utilities: number[] = [];
    protected service_names: string[] = []

    constructor() {}

    protected async build(soak:number,peak:number,ttp:number,num_services:number,num_workers:number,heuristic_name="MaxOverallServices"): Promise<number> {
        const increase_per_tick = peak / ttp
        var curr_reqs_num:number = increase_per_tick
        var all_reqs:Request[] = []
        var ttl_utility:number = 0
        var ttl_updates:number = 0

        var services = this.init_services(num_services,false,[.9,.9,.8,.8,.8,0.1,0.1,0.1,0.1,0.1],
            [
            "img1","otherImgs","buyNow","atc","suggestions","reviews","details","boughtWith","header","footer"
            ]
        )
        
        await this.build_phase(
            all_reqs,
            curr_reqs_num,
            heuristic_name,
            num_services,
            num_workers,
            soak,
            services,
            ttl_updates, 
            ttl_utility,
            increase_per_tick,
            1
        )
        await this.build_phase(
            all_reqs,
            curr_reqs_num,
            heuristic_name,
            num_services,
            num_workers,
            peak,
            services,
            ttl_updates, 
            ttl_utility,
            increase_per_tick,
            0
        )
        await this.build_phase(
            all_reqs,
            curr_reqs_num,
            heuristic_name,
            num_services,
            num_workers,
            ttp,
            services,
            ttl_updates, 
            ttl_utility,
            increase_per_tick,
            -1
        )

        return ttl_utility
    }

    protected async build_phase(
            all_reqs:Request[],
            curr_reqs_num:number,
            heuristic_name="MaxOverallServices",
            num_services:number,
            num_workers:number,
            phase_type_dur:number,
            services: Services,
            ttl_updates:number, 
            ttl_utility:number,
            increase_per_tick:number,
            mult: number        
        ) {
        console.log("build_phase")
        for (let iter = 0;iter<phase_type_dur;iter++) { //soak
            ttl_updates ++
            let new_reqs:Request[] = this.gen_reqs(curr_reqs_num,num_services)
            all_reqs.push(...new_reqs)
            await this.heuristic(num_workers,heuristic_name,all_reqs,services)
            const add_utility:number = await this.allocate(all_reqs,services)
            ttl_utility += add_utility
            curr_reqs_num += (increase_per_tick * mult)
        }
    }

    protected gen_reqs(num:number,num_services:number): Request[] {
        var list:Request[] = []

        for (let i = 0; i < num;i++){
            var rand = (Math.random()*2)+10
            var req = new Request(rand.toString())
            req.unassigned_services = Array(num_services).fill(1).map( (_, i) => i+1 )

            list.push(req)
        }
        return list
    }

    protected abstract allocate(reqs:Request[],services:Services): Promise<number>
    protected abstract heuristic(num_workers:number,heuristic:string,requests:Request[],services:Services): Promise<void>
    protected abstract init_services(num_services:number,rand_utilities:boolean,list_utilities:number[],list_names:string[]): Services
    public abstract testing(iter:number): Promise<number[]>

}