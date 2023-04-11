import { Request, Service } from "../resources";

export type Services = {
    list: Service[]
}

export interface BuildPhaseContract {
    increase_per_tick:number,
    curr_reqs_num:number;
    all_reqs:Request[];
    ttl_utility:number;
    ttl_updates:number;
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

        var build_phase_contract: BuildPhaseContract = {
            increase_per_tick: increase_per_tick,
            curr_reqs_num: curr_reqs_num,
            all_reqs: all_reqs,
            ttl_utility: ttl_utility,
            ttl_updates: ttl_updates,
        }

        var services = this.init_services(num_services,false,[.9,.9,.8,.8,.8,0.1,0.1,0.1,0.1,0.1],
            [
            "img1","otherImgs","buyNow","atc","suggestions","reviews","details","boughtWith","header","footer"
            ]
        )
        
        await this.build_phase(
            heuristic_name,
            num_services,
            num_workers,
            soak,
            services,
            1,
            build_phase_contract
        )
        await this.build_phase(
            heuristic_name,
            num_services,
            num_workers,
            peak,
            services,
            0,
            build_phase_contract
        )
        await this.build_phase(
            heuristic_name,
            num_services,
            num_workers,
            ttp,
            services,
            -1,
            build_phase_contract
        )

        return build_phase_contract.ttl_utility
    }

    // TODO these parameters need to pass by reference instead of value as they do now.
    protected async build_phase(
            heuristic_name="MaxOverallServices",
            num_services:number,
            num_workers:number,
            phase_type_dur:number,
            services: Services,
            mult: number,
            contract: BuildPhaseContract        
        ) {
        for (let iter = 0;iter<phase_type_dur;iter++) { //soak
            contract.ttl_updates ++
            let new_reqs:Request[] = this.gen_reqs(contract.curr_reqs_num,num_services)
            contract.all_reqs.push(...new_reqs)
            await this.heuristic(num_workers,heuristic_name,contract.all_reqs,services)
            const add_utility:number = await this.allocate(contract.all_reqs,services)
            contract.ttl_utility += add_utility
            contract.curr_reqs_num += (contract.increase_per_tick * mult)
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