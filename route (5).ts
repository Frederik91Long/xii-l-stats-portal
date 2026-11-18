import {NextRequest,NextResponse} from 'next/server';
import {LEAGUE_ID,sleeper,League,Roster,User,Matchup} from '@/lib/sleeper';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 try{
 const requested=Number(request.nextUrl.searchParams.get('week'));
 const [league,rosters,users,state]=await Promise.all([
 sleeper<League>(`/league/${LEAGUE_ID}`),sleeper<Roster[]>(`/league/${LEAGUE_ID}/rosters`),sleeper<User[]>(`/league/${LEAGUE_ID}/users`),sleeper<{week:number}>(`/state/nfl`)]);
 if(!league||!Array.isArray(rosters)||!Array.isArray(users))throw new Error('Invalid Sleeper response');
 const currentWeek=Number(league.settings?.leg)||Number(state?.week)||1;
 const week=Number.isInteger(requested)&&requested>=1&&requested<=18?requested:Math.max(1,Math.min(18,currentWeek));
 const matchups=await sleeper<Matchup[]>(`/league/${LEAGUE_ID}/matchups/${week}`);
 return NextResponse.json({league,rosters,users,matchups,week,currentWeek,leagueId:LEAGUE_ID,fetchedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, s-maxage=60, stale-while-revalidate=120'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unknown import error'},{status:502});}
}
