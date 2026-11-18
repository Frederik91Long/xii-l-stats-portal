import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {LEAGUE_ID,sleeper,League,Roster,User,Matchup} from '@/lib/sleeper';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Supabase environment variables not configured'},{status:503});
 try{
 const [league,rosters,users]=await Promise.all([sleeper<League>(`/league/${LEAGUE_ID}`),sleeper<Roster[]>(`/league/${LEAGUE_ID}/rosters`),sleeper<User[]>(`/league/${LEAGUE_ID}/users`)]);
 const week=Math.max(1,Math.min(18,Number(league.settings?.leg)||1));
 const matchups=await sleeper<Matchup[]>(`/league/${LEAGUE_ID}/matchups/${week}`);
 const db=createClient(url,key,{auth:{persistSession:false}});
 const {error}=await db.from('sleeper_snapshots').upsert({league_id:LEAGUE_ID,season:league.season,week,payload:{league,rosters,users,matchups},synced_at:new Date().toISOString()},{onConflict:'league_id,season,week'});
 if(error)throw error;
 return NextResponse.json({ok:true,leagueId:LEAGUE_ID,week,rosters:rosters.length,matchups:matchups.length});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Sync error'},{status:502});}
}
