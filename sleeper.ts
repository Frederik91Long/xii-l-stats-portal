export const LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID || '1317560135530344449';
const ROOT = 'https://api.sleeper.app/v1';
export type User = {user_id:string; display_name?:string; avatar?:string|null; metadata?:{team_name?:string}};
export type Roster = {roster_id:number; owner_id:string|null; players?:string[]|null; starters?:string[]|null; settings?:Record<string,number>; metadata?:Record<string,string>};
export type League = {name:string; season:string; status?:string; settings?:Record<string,number>; metadata?:Record<string,string>; previous_league_id?:string|null};
export type Matchup = {roster_id:number; matchup_id:number|null; points:number; custom_points?:number|null; starters?:string[]; players?:string[]; starters_points?:number[]; players_points?:Record<string,number>};
export async function sleeper<T>(path:string):Promise<T>{
 const response=await fetch(`${ROOT}${path}`,{next:{revalidate:120},headers:{accept:'application/json'}});
 if(!response.ok)throw new Error(`Sleeper returned HTTP ${response.status}`);
 return response.json() as Promise<T>;
}
export function teamName(roster:Roster,users:User[]){const u=users.find(x=>x.user_id===roster.owner_id);return u?.metadata?.team_name?.trim()||u?.display_name||`Roster ${roster.roster_id}`;}
export function points(settings:Record<string,number>|undefined,key:'fpts'|'fpts_against'){return (settings?.[key]||0)+(settings?.[`${key}_decimal`]||0)/100;}
export function standings(rosters:Roster[]){return [...rosters].sort((a,b)=>{const x=a.settings||{},y=b.settings||{};return ((y.wins||0)+.5*(y.ties||0))-((x.wins||0)+.5*(x.ties||0))||points(y,'fpts')-points(x,'fpts')});}
export function pairMatchups(rows:Matchup[]){const groups=new Map<number,Matchup[]>();for(const row of rows){if(row.matchup_id===null||row.matchup_id===undefined)continue;const list=groups.get(row.matchup_id)||[];list.push(row);groups.set(row.matchup_id,list);}return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([id,teams])=>({id,teams}));}
