import{initializeApp}from"https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import{getDatabase,ref,set,onValue,update,push,get,remove}from"https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
import{getAI,getGenerativeModel,GoogleAIBackend}from"https://www.gstatic.com/firebasejs/12.3.0/firebase-ai.js";
import{getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,onAuthStateChanged,signOut,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult}from"https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const cfg={apiKey:"AIzaSyCjTwIQapCFbAXkHlPYBdX8Hob_gVJZs98",authDomain:"ipl-auction-26.firebaseapp.com",databaseURL:"https://ipl-auction-26-default-rtdb.firebaseio.com",projectId:"ipl-auction-26",storageBucket:"ipl-auction-26.firebasestorage.app",messagingSenderId:"201005854292",appId:"1:201005854292:web:c223f76d9194a2f8a047c1"};
const app=initializeApp(cfg),db=getDatabase(app),auth=getAuth(app),gp=new GoogleAuthProvider();
// Firebase AI Logic -- lazy init so a missing console setup never blocks auth
let _geminiModel=null;
function getGeminiModel(){
 if(_geminiModel) return _geminiModel;
 try{
 const ai=getAI(app,{backend:new GoogleAIBackend()});
 _geminiModel=getGenerativeModel(ai,{model:"gemini-2.5-flash"});
 return _geminiModel;
 }catch(e){
 throw new Error("Firebase AI Logic not set up yet. Enable it in your Firebase Console -> Build -> AI Logic, then reload.");
 }
}

const SUPER_ADMIN='namanmehra@gmail.com';
function isSuperAdminEmail(email){ return (email||'').toLowerCase().trim()==='namanmehra@gmail.com'; }
let user=null,roomId=null,roomState=null,isAdmin=false,roomListener=null,isSignup=false;
let myTeamName='',pendingJoinRoomId='',roomToDelete='',roomToDeleteName='';
let releaseTeam='',releaseIdx=-1,releasePlayerName='',releasePrice=0;
let autoSellInProgress=false;
let cachedAllPlayers=null;

// -- Player data --
const rawData=[
{n:"Ruturaj Gaikwad",t:"CSK",r:"Batter",o:false},{n:"MS Dhoni",t:"CSK",r:"Wicketkeeper",o:false},{n:"Dewald Brevis* (SA)",t:"CSK",r:"Batter",o:true},{n:"Ayush Mhatre",t:"CSK",r:"Batter",o:false},{n:"Urvil Patel",t:"CSK",r:"Wicketkeeper",o:false},{n:"Anshul Kamboj",t:"CSK",r:"All-rounder",o:false},{n:"Jamie Overton* (ENG)",t:"CSK",r:"Bowler",o:true},{n:"Ramakrishna Ghosh",t:"CSK",r:"All-rounder",o:false},{n:"Shivam Dube",t:"CSK",r:"All-rounder",o:false},{n:"Khaleel Ahmed",t:"CSK",r:"Bowler",o:false},{n:"Noor Ahmad* (AFG)",t:"CSK",r:"Bowler",o:true},{n:"Mukesh Choudhary",t:"CSK",r:"Bowler",o:false},{n:"Nathan Ellis* (AUS)",t:"CSK",r:"Bowler",o:true},{n:"Shreyas Gopal",t:"CSK",r:"Bowler",o:false},{n:"Gurjapneet Singh",t:"CSK",r:"Bowler",o:false},{n:"Sanju Samson",t:"CSK",r:"Wicketkeeper",o:false},{n:"Akeal Hosein* (WI)",t:"CSK",r:"Bowler",o:true},{n:"Prashant Veer",t:"CSK",r:"All-rounder",o:false},{n:"Kartik Sharma",t:"CSK",r:"Wicketkeeper",o:false},{n:"Matthew Short* (AUS)",t:"CSK",r:"All-rounder",o:true},{n:"Aman Khan",t:"CSK",r:"All-rounder",o:false},{n:"Sarfaraz Khan",t:"CSK",r:"Batter",o:false},{n:"Rahul Chahar",t:"CSK",r:"Bowler",o:false},{n:"Matt Henry* (NZ)",t:"CSK",r:"Bowler",o:true},{n:"Zak Foulkes* (NZ)",t:"CSK",r:"All-rounder",o:true},
{n:"KL Rahul",t:"DC",r:"Wicketkeeper",o:false},{n:"Karun Nair",t:"DC",r:"Batter",o:false},{n:"Abishek Porel",t:"DC",r:"Wicketkeeper",o:false},{n:"Tristan Stubbs* (SA)",t:"DC",r:"Batter",o:true},{n:"Axar Patel",t:"DC",r:"All-rounder",o:false},{n:"Sameer Rizvi",t:"DC",r:"Batter",o:false},{n:"Ashutosh Sharma",t:"DC",r:"Batter",o:false},{n:"Vipraj Nigam",t:"DC",r:"All-rounder",o:false},{n:"Ajay Mandal",t:"DC",r:"All-rounder",o:false},{n:"Tripurana Vijay",t:"DC",r:"All-rounder",o:false},{n:"Madhav Tiwari",t:"DC",r:"All-rounder",o:false},{n:"Mitchell Starc* (AUS)",t:"DC",r:"Bowler",o:true},{n:"T. Natarajan",t:"DC",r:"Bowler",o:false},{n:"Mukesh Kumar",t:"DC",r:"Bowler",o:false},{n:"Dushmantha Chameera* (SL)",t:"DC",r:"Bowler",o:true},{n:"Kuldeep Yadav",t:"DC",r:"Bowler",o:false},{n:"Nitish Rana",t:"DC",r:"Batter",o:false},{n:"Auqib Dar",t:"DC",r:"All-rounder",o:false},{n:"Ben Duckett* (ENG)",t:"DC",r:"Wicketkeeper",o:true},{n:"David Miller* (SA)",t:"DC",r:"Batter",o:true},{n:"Pathum Nissanka* (SL)",t:"DC",r:"Batter",o:true},{n:"Lungi Ngidi* (SA)",t:"DC",r:"Bowler",o:true},{n:"Sahil Parakh",t:"DC",r:"Batter",o:false},{n:"Prithvi Shaw",t:"DC",r:"Batter",o:false},{n:"Kyle Jamieson* (NZ)",t:"DC",r:"Bowler",o:true},
{n:"Shubman Gill",t:"GT",r:"Batter",o:false},{n:"Sai Sudharsan",t:"GT",r:"Batter",o:false},{n:"Kumar Kushagra",t:"GT",r:"Wicketkeeper",o:false},{n:"Anuj Rawat",t:"GT",r:"Wicketkeeper",o:false},{n:"Jos Buttler* (ENG)",t:"GT",r:"Wicketkeeper",o:true},{n:"Nishant Sindhu",t:"GT",r:"All-rounder",o:false},{n:"Glenn Phillips* (NZ)",t:"GT",r:"All-rounder",o:true},{n:"Washington Sundar",t:"GT",r:"All-rounder",o:false},{n:"Arshad Khan",t:"GT",r:"Bowler",o:false},{n:"Shahrukh Khan",t:"GT",r:"Batter",o:false},{n:"Rahul Tewatia",t:"GT",r:"All-rounder",o:false},{n:"Kagiso Rabada* (SA)",t:"GT",r:"Bowler",o:true},{n:"Mohammed Siraj",t:"GT",r:"Bowler",o:false},{n:"Prasidh Krishna",t:"GT",r:"Bowler",o:false},{n:"Ishant Sharma",t:"GT",r:"Bowler",o:false},{n:"Gurnoor Singh Brar",t:"GT",r:"Bowler",o:false},{n:"Rashid Khan* (AFG)",t:"GT",r:"Bowler",o:true},{n:"Manav Suthar",t:"GT",r:"Bowler",o:false},{n:"Sai Kishore",t:"GT",r:"Bowler",o:false},{n:"Jayant Yadav",t:"GT",r:"Bowler",o:false},{n:"Ashok Sharma",t:"GT",r:"Bowler",o:false},{n:"Jason Holder* (WI)",t:"GT",r:"All-rounder",o:true},{n:"Tom Banton* (ENG)",t:"GT",r:"Batter",o:true},{n:"Luke Wood* (ENG)",t:"GT",r:"Bowler",o:true},{n:"Prithviraj Yarra",t:"GT",r:"Bowler",o:false},
{n:"Ajinkya Rahane",t:"KKR",r:"Batter",o:false},{n:"Rinku Singh",t:"KKR",r:"Batter",o:false},{n:"Angkrish Raghuvanshi",t:"KKR",r:"Batter",o:false},{n:"Manish Pandey",t:"KKR",r:"Batter",o:false},{n:"Rovman Powell* (WI)",t:"KKR",r:"All-rounder",o:true},{n:"Anukul Roy",t:"KKR",r:"All-rounder",o:false},{n:"Ramandeep Singh",t:"KKR",r:"Batter",o:false},{n:"Vaibhav Arora",t:"KKR",r:"Bowler",o:false},{n:"Sunil Narine* (WI)",t:"KKR",r:"All-rounder",o:true},{n:"Varun Chakaravarthy",t:"KKR",r:"Bowler",o:false},{n:"Harshit Rana",t:"KKR",r:"Bowler",o:false},{n:"Umran Malik",t:"KKR",r:"Bowler",o:false},{n:"Cameron Green* (AUS)",t:"KKR",r:"All-rounder",o:true},{n:"Matheesha Pathirana* (SL)",t:"KKR",r:"Bowler",o:true},{n:"Finn Allen* (NZ)",t:"KKR",r:"Wicketkeeper",o:true},{n:"Tejasvi Singh",t:"KKR",r:"Wicketkeeper",o:false},{n:"Prashant Solanki",t:"KKR",r:"Bowler",o:false},{n:"Kartik Tyagi",t:"KKR",r:"Bowler",o:false},{n:"Rahul Tripathi",t:"KKR",r:"Batter",o:false},{n:"Tim Seifert* (NZ)",t:"KKR",r:"Wicketkeeper",o:true},{n:"Sarthak Ranjan",t:"KKR",r:"All-rounder",o:false},{n:"Daksh Kamra",t:"KKR",r:"All-rounder",o:false},{n:"Akash Deep",t:"KKR",r:"Bowler",o:false},{n:"Rachin Ravindra* (NZ)",t:"KKR",r:"All-rounder",o:true},{n:"Blessing Muzarabani* (ZIM)",t:"KKR",r:"Bowler",o:true},
{n:"Rishabh Pant",t:"LSG",r:"Wicketkeeper",o:false},{n:"Ayush Badoni",t:"LSG",r:"All-rounder",o:false},{n:"Abdul Samad",t:"LSG",r:"Batter",o:false},{n:"Aiden Markram* (SA)",t:"LSG",r:"Batter",o:true},{n:"Himmat Singh",t:"LSG",r:"Batter",o:false},{n:"Matthew Breetzke* (SA)",t:"LSG",r:"Batter",o:true},{n:"Nicholas Pooran* (WI)",t:"LSG",r:"Wicketkeeper",o:true},{n:"Mitchell Marsh* (AUS)",t:"LSG",r:"Batter",o:true},{n:"Shahbaz Ahamad",t:"LSG",r:"All-rounder",o:false},{n:"Arshin Kulkarni",t:"LSG",r:"All-rounder",o:false},{n:"Mayank Yadav",t:"LSG",r:"Bowler",o:false},{n:"Avesh Khan",t:"LSG",r:"Bowler",o:false},{n:"Mohsin Khan",t:"LSG",r:"Bowler",o:false},{n:"M. Siddharth",t:"LSG",r:"Bowler",o:false},{n:"Digvesh Rathi",t:"LSG",r:"Bowler",o:false},{n:"Prince Yadav",t:"LSG",r:"Bowler",o:false},{n:"Akash Singh",t:"LSG",r:"Bowler",o:false},{n:"Arjun Tendulkar",t:"LSG",r:"Bowler",o:false},{n:"Mohammed Shami",t:"LSG",r:"Bowler",o:false},{n:"Anrich Nortje* (SA)",t:"LSG",r:"Bowler",o:true},{n:"Wanindu Hasaranga* (SL)",t:"LSG",r:"All-rounder",o:true},{n:"Mukul Choudhary",t:"LSG",r:"Wicketkeeper",o:false},{n:"Naman Tiwari",t:"LSG",r:"All-rounder",o:false},{n:"Akshat Raghuwanshi",t:"LSG",r:"Batter",o:false},{n:"Josh Inglis* (AUS)",t:"LSG",r:"Batter",o:true},
{n:"Rohit Sharma",t:"MI",r:"Batter",o:false},{n:"Surya Kumar Yadav",t:"MI",r:"Batter",o:false},{n:"Robin Minz",t:"MI",r:"Wicketkeeper",o:false},{n:"Ryan Rickelton* (SA)",t:"MI",r:"Wicketkeeper",o:true},{n:"Tilak Varma",t:"MI",r:"Batter",o:false},{n:"Hardik Pandya",t:"MI",r:"All-rounder",o:false},{n:"Naman Dhir",t:"MI",r:"All-rounder",o:false},{n:"Mitchell Santner* (NZ)",t:"MI",r:"All-rounder",o:true},{n:"Will Jacks* (ENG)",t:"MI",r:"All-rounder",o:true},{n:"Corbin Bosch* (SA)",t:"MI",r:"All-rounder",o:true},{n:"Raj Bawa",t:"MI",r:"All-rounder",o:false},{n:"Trent Boult* (NZ)",t:"MI",r:"Bowler",o:true},{n:"Jasprit Bumrah",t:"MI",r:"Bowler",o:false},{n:"Deepak Chahar",t:"MI",r:"Bowler",o:false},{n:"Ashwani Kumar",t:"MI",r:"Bowler",o:false},{n:"Raghu Sharma",t:"MI",r:"Bowler",o:false},{n:"Allah Ghazanfar* (AFG)",t:"MI",r:"Bowler",o:true},{n:"Mayank Markande",t:"MI",r:"Bowler",o:false},{n:"Shardul Thakur",t:"MI",r:"All-rounder",o:false},{n:"Sherfane Rutherford* (WI)",t:"MI",r:"Batter",o:true},{n:"Quinton De Kock* (SA)",t:"MI",r:"Wicketkeeper",o:true},{n:"Atharva Ankolekar",t:"MI",r:"All-rounder",o:false},{n:"Mohammad Izhar",t:"MI",r:"Bowler",o:false},{n:"Danish Malewar",t:"MI",r:"Batter",o:false},{n:"Mayank Rawat",t:"MI",r:"All-rounder",o:false},
{n:"Shreyas Iyer",t:"PBKS",r:"Batter",o:false},{n:"Nehal Wadhera",t:"PBKS",r:"Batter",o:false},{n:"Vishnu Vinod",t:"PBKS",r:"Wicketkeeper",o:false},{n:"Harnoor Pannu",t:"PBKS",r:"Batter",o:false},{n:"Pyla Avinash",t:"PBKS",r:"Batter",o:false},{n:"Prabhsimran Singh",t:"PBKS",r:"Wicketkeeper",o:false},{n:"Shashank Singh",t:"PBKS",r:"Batter",o:false},{n:"Marcus Stoinis* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Harpreet Brar",t:"PBKS",r:"All-rounder",o:false},{n:"Marco Jansen* (SA)",t:"PBKS",r:"All-rounder",o:true},{n:"Azmatullah Omarzai* (AFG)",t:"PBKS",r:"All-rounder",o:true},{n:"Priyansh Arya",t:"PBKS",r:"All-rounder",o:false},{n:"Musheer Khan",t:"PBKS",r:"All-rounder",o:false},{n:"Suryansh Shedge",t:"PBKS",r:"All-rounder",o:false},{n:"Mitch Owen* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Arshdeep Singh",t:"PBKS",r:"Bowler",o:false},{n:"Yuzvendra Chahal",t:"PBKS",r:"Bowler",o:false},{n:"Vyshak Vijaykumar",t:"PBKS",r:"Bowler",o:false},{n:"Yash Thakur",t:"PBKS",r:"Bowler",o:false},{n:"Xavier Bartlett* (AUS)",t:"PBKS",r:"Bowler",o:true},{n:"Lockie Ferguson* (NZ)",t:"PBKS",r:"Bowler",o:true},{n:"Cooper Connolly* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Ben Dwarshuis* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Vishal Nishad",t:"PBKS",r:"Bowler",o:false},{n:"Pravin Dubey",t:"PBKS",r:"Bowler",o:false},
{n:"Shubham Dubey",t:"RR",r:"Batter",o:false},{n:"Vaibhav Suryavanshi",t:"RR",r:"Batter",o:false},{n:"Lhuan-dre Pretorius* (SA)",t:"RR",r:"Batter",o:true},{n:"Shimron Hetmyer* (WI)",t:"RR",r:"Batter",o:true},{n:"Yashasvi Jaiswal",t:"RR",r:"Batter",o:false},{n:"Dhruv Jurel",t:"RR",r:"Wicketkeeper",o:false},{n:"Riyan Parag",t:"RR",r:"Batter",o:false},{n:"Yudhvir Singh Charak",t:"RR",r:"All-rounder",o:false},{n:"Jofra Archer* (ENG)",t:"RR",r:"Bowler",o:true},{n:"Tushar Deshpande",t:"RR",r:"Bowler",o:false},{n:"Sandeep Sharma",t:"RR",r:"Bowler",o:false},{n:"Kwena Maphaka* (SA)",t:"RR",r:"Bowler",o:true},{n:"Nandre Burger* (SA)",t:"RR",r:"Bowler",o:true},{n:"Ravindra Jadeja",t:"RR",r:"All-rounder",o:false},{n:"Sam Curran* (ENG)",t:"RR",r:"All-rounder",o:true},{n:"Donovan Ferreira* (SA)",t:"RR",r:"Wicketkeeper",o:true},{n:"Ravi Bishnoi",t:"RR",r:"Bowler",o:false},{n:"Sushant Mishra",t:"RR",r:"Bowler",o:false},{n:"Vignesh Puthur",t:"RR",r:"Bowler",o:false},{n:"Yash Raj Punja",t:"RR",r:"Bowler",o:false},{n:"Ravi Singh",t:"RR",r:"Wicketkeeper",o:false},{n:"Brijesh Sharma",t:"RR",r:"Bowler",o:false},{n:"Aman Rao",t:"RR",r:"Batter",o:false},{n:"Adam Milne* (NZ)",t:"RR",r:"Bowler",o:true},{n:"Kuldeep Sen",t:"RR",r:"Bowler",o:false},{n:"Dasun Shanaka* (SL)",t:"RR",r:"All-rounder",o:true},
{n:"Rajat Patidar",t:"RCB",r:"Batter",o:false},{n:"Virat Kohli",t:"RCB",r:"Batter",o:false},{n:"Tim David* (AUS)",t:"RCB",r:"All-rounder",o:true},{n:"Devdutt Padikkal",t:"RCB",r:"Batter",o:false},{n:"Phil Salt* (ENG)",t:"RCB",r:"Wicketkeeper",o:true},{n:"Jitesh Sharma",t:"RCB",r:"Wicketkeeper",o:false},{n:"Krunal Pandya",t:"RCB",r:"All-rounder",o:false},{n:"Jacob Bethell* (ENG)",t:"RCB",r:"All-rounder",o:true},{n:"Romario Shepherd* (WI)",t:"RCB",r:"All-rounder",o:true},{n:"Swapnil Singh",t:"RCB",r:"All-rounder",o:false},{n:"Josh Hazlewood* (AUS)",t:"RCB",r:"Bowler",o:true},{n:"Bhuvneshwar Kumar",t:"RCB",r:"Bowler",o:false},{n:"Rasikh Salam",t:"RCB",r:"Bowler",o:false},{n:"Yash Dayal",t:"RCB",r:"Bowler",o:false},{n:"Suyash Sharma",t:"RCB",r:"Bowler",o:false},{n:"Nuwan Thushara* (SL)",t:"RCB",r:"Bowler",o:true},{n:"Abhinandan Singh",t:"RCB",r:"Bowler",o:false},{n:"Venkatesh Iyer",t:"RCB",r:"All-rounder",o:false},{n:"Jacob Duffy* (NZ)",t:"RCB",r:"Bowler",o:true},{n:"Mangesh Yadav",t:"RCB",r:"All-rounder",o:false},{n:"Satvik Deswal",t:"RCB",r:"All-rounder",o:false},{n:"Jordan Cox* (ENG)",t:"RCB",r:"Batter",o:true},{n:"Kanishk Chouhan",t:"RCB",r:"All-rounder",o:false},{n:"Vihaan Malhotra",t:"RCB",r:"All-rounder",o:false},{n:"Vicky Ostwal",t:"RCB",r:"All-rounder",o:false},
{n:"Travis Head* (AUS)",t:"SRH",r:"Batter",o:true},{n:"Abhishek Sharma",t:"SRH",r:"All-rounder",o:false},{n:"Aniket Verma",t:"SRH",r:"Batter",o:false},{n:"R Smaran",t:"SRH",r:"Batter",o:false},{n:"Ishan Kishan",t:"SRH",r:"Wicketkeeper",o:false},{n:"Heinrich Klaasen* (SA)",t:"SRH",r:"Wicketkeeper",o:true},{n:"Nitish Kumar Reddy",t:"SRH",r:"All-rounder",o:false},{n:"Harsh Dubey",t:"SRH",r:"All-rounder",o:false},{n:"Kamindu Mendis* (SL)",t:"SRH",r:"All-rounder",o:true},{n:"Harshal Patel",t:"SRH",r:"All-rounder",o:false},{n:"Brydon Carse* (ENG)",t:"SRH",r:"All-rounder",o:true},{n:"Pat Cummins* (AUS)",t:"SRH",r:"Bowler",o:true},{n:"Jaydev Unadkat",t:"SRH",r:"Bowler",o:false},{n:"Eshan Malinga* (SL)",t:"SRH",r:"Bowler",o:true},{n:"Zeeshan Ansari",t:"SRH",r:"Bowler",o:false},{n:"Shivang Kumar",t:"SRH",r:"All-rounder",o:false},{n:"Salil Arora",t:"SRH",r:"Wicketkeeper",o:false},{n:"Krains Fuletra",t:"SRH",r:"Bowler",o:false},{n:"Praful Hinge",t:"SRH",r:"Bowler",o:false},{n:"Amit Kumar",t:"SRH",r:"Bowler",o:false},{n:"Onkar Tarmale",t:"SRH",r:"Bowler",o:false},{n:"Sakib Hussain",t:"SRH",r:"Bowler",o:false},{n:"Liam Livingstone* (ENG)",t:"SRH",r:"All-rounder",o:true},{n:"Shivam Mavi",t:"SRH",r:"Bowler",o:false},{n:"Jack Edwards* (AUS)",t:"SRH",r:"All-rounder",o:true}
];

const ERRS={
 'auth/invalid-credential':'Invalid email or password.',
 'auth/user-not-found':'No account with this email.',
 'auth/wrong-password':'Incorrect password.',
 'auth/email-already-in-use':'Email already registered. Try signing in.',
 'auth/weak-password':'Password must be at least 6 characters.',
 'auth/invalid-email':'Enter a valid email address.',
 'auth/too-many-requests':'Too many attempts. Please wait a moment.',
 'auth/unauthorized-domain':'This domain is not authorized. Add it in Firebase Console -> Auth -> Authorized Domains.',
 'auth/api-key-not-valid':'API key invalid. Check Firebase config.',
};

// -- Helpers --
const N=p=>p.name||p.n||'Unknown';
const T=p=>p.iplTeam||p.t||'';
const R=p=>p.role||p.r||'';
const O=p=>!!(p.isOverseas||p.o);




window.showAlert=function(msg,type='err'){
 const t=document.getElementById('toast');
 document.getElementById('tmsg').textContent=msg;
 t.className=`show ${type}`;
 clearTimeout(t._t);
 t._t=setTimeout(()=>t.classList.remove('show'),4800);
};

// -- View management --
function showAuth(){document.getElementById('auth-view').classList.add('active');document.getElementById('app-shell').classList.remove('active');}
function showApp(){
 document.getElementById('auth-view').classList.remove('active');
 document.getElementById('app-shell').classList.add('active');
 document.getElementById('topbarUser').textContent=user?.email||'';
 // Show super admin tab only for namanmehra@gmail.com
 const saTab=document.getElementById('dt-superadmin');
 if(saTab) saTab.style.display=isSuperAdminEmail(user?.email)?'block':'none';
}
function showInner(id){['dashboard-view','auction-view'].forEach(v=>document.getElementById(v).classList.remove('active'));document.getElementById(id).classList.add('active');}

window.switchDashTab=function(tab){
 ['scorecards','created','joined','superadmin'].forEach(t=>{
 document.getElementById(`dt-${t}`).classList.toggle('active',t===tab);
 document.getElementById(`tab-${t}`).style.display=t===tab?'block':'none';
 });
 if(tab==='superadmin') renderSuperAdminPanel();
 if(tab==='scorecards'){
 renderGlobalScorecardHistory();
 // Pre-build the player datalist from rawData so it's ready immediately
 if(!document.getElementById('gscDlPlayers')){
 const dl=document.createElement('datalist'); dl.id='gscDlPlayers';
 [...new Set((rawData||[]).map(p=>p.n||'').filter(Boolean))].sort().forEach(n=>{
 const o=document.createElement('option'); o.value=n; dl.appendChild(o);
 });
 document.body.appendChild(dl);
 }
 }
};

window.toggleCreateForm=function(){
 const f=document.getElementById('create-form'),btn=document.getElementById('createToggleBtn');
 const show=f.style.display==='none';
 f.style.display=show?'block':'none';
 btn.textContent=show?'x Cancel':'+ Create New';
};

// -- Auth mode toggle (show pw hint on signup) --
window.toggleAuthMode=function(){
 isSignup=!isSignup;
 document.getElementById('authLabel').textContent=isSignup?'Create your account':'Sign in to continue';
 document.getElementById('authBtn').textContent=isSignup?'Create Account':'Sign In';
 document.getElementById('authToggleBtn').textContent=isSignup?'Already have an account? Sign in':'Create an account instead';
 document.getElementById('pwHint').style.display=isSignup?'block':'none';
};

// -- Auth --
getRedirectResult(auth).then(r=>{
 if(r?.user){
 window.showAlert('Signed in with Google!','ok');
 setTimeout(()=>{
 const saTab=document.getElementById('dt-superadmin');
 if(saTab&&r.user) saTab.style.display=isSuperAdminEmail(r.user.email)?'block':'none';
 },300);
 }
}).catch(e=>{if(e.code&&e.code!=='auth/no-current-user')window.showAlert(ERRS[e.code]||e.message);});

onAuthStateChanged(auth,u=>{
 user=u;
 const params=new URLSearchParams(window.location.search);
 const rp=params.get('room'),dp=params.get('draft');
 if(u){
 showApp();
 setTimeout(()=>{ const s=document.getElementById('dt-superadmin'); if(s) s.style.display=isSuperAdminEmail(u.email)?'block':'none'; },200);
 if(rp)loadRoom(rp);else if(dp)loadDraftRoom(dp);else loadDash();
 }
 else showAuth();
});

window.handleAuth=function(){
 const email=document.getElementById('authEmail').value.trim();
 const pass=document.getElementById('authPassword').value;
 if(!email||!pass)return window.showAlert('Enter your email and password.');
 if(isSignup&&pass.length<6)return window.showAlert('Password must be at least 6 characters.');
 const fn=isSignup?createUserWithEmailAndPassword:signInWithEmailAndPassword;
 fn(auth,email,pass).then(()=>window.showAlert(isSignup?'Account created! Welcome.':'Signed in!','ok')).catch(e=>window.showAlert(ERRS[e.code]||e.message));
};

window.signInWithGoogle=function(){
 signInWithPopup(auth,gp).then(()=>window.showAlert('Signed in!','ok')).catch(e=>{
 if(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(e.code))signInWithRedirect(auth,gp);
 else window.showAlert(ERRS[e.code]||e.message);
 });
};

window.resetPassword=function(){
 const email=document.getElementById('authEmail').value.trim();
 if(!email)return window.showAlert('Enter your email first.');
 sendPasswordResetEmail(auth,email).then(()=>window.showAlert('Reset link sent to your email.','ok')).catch(e=>window.showAlert(e.message));
};

window.logoutUser=function(){
 if(roomListener){roomListener();roomListener=null;}
 signOut(auth).then(()=>history.replaceState({},'',window.location.pathname));
};

// -- Dashboard --
function rcHTML(key,room,isOwner){
 const deleteBtn=isOwner?`<button class="btn btn-danger btn-sm" onclick="window.openDeleteModal('${key}','${(room.name||'Room').replace(/'/g,"\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete</button>`:'';
 const leaveBtn=!isOwner?`<button class="btn btn-ghost btn-sm" style="color:var(--err);border-color:rgba(239,68,68,.3);" onclick="window.leaveAuctionRoom('${key}','${(room.name||'Room').replace(/'/g,"\\'")}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Leave</button>`:'';
 return`<div class="rc"><div class="rc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L8 8l4 4-4 6h8l-4-6 4-4-4-6z"/><line x1="7" y1="22" x2="17" y2="22"/></svg></div><div class="rc-info"><div class="rc-name">${room.name||'Auction Room'}</div><div class="rc-meta">\u20b9${room.budget||'--'} Cr &nbsp;.&nbsp; <span class="badge ${isOwner?'bg':'bb'}">${isOwner?'Admin':'Member'}</span></div></div><div class="rc-actions">${deleteBtn}${leaveBtn}
 <button class="btn btn-outline btn-sm" onclick="window.location.search='?room=${key}'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Enter</button></div></div>`;
}

function loadDash(){
 showInner('dashboard-view');
 roomId=null;myTeamName='';
 if(roomListener){roomListener();roomListener=null;}
 // Re-assert super admin tab every time dashboard loads
 const _saTab=document.getElementById('dt-superadmin');
 if(_saTab) _saTab.style.display=isSuperAdminEmail(user?.email)?'block':'none';
 onValue(ref(db,`users/${user.uid}/auctions`),snap=>{
 const rooms=snap.val(),c=document.getElementById('roomListContainer');
 if(!rooms){c.innerHTML='<div class="empty">No rooms yet -- create one above.</div>';return;}
 c.innerHTML='';
 Object.entries(rooms).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0)).forEach(([k,r])=>c.innerHTML+=rcHTML(k,r,true));
 });
 onValue(ref(db,`users/${user.uid}/joined`),snap=>{
 const rooms=snap.val(),c=document.getElementById('joinedRoomListContainer');
 if(!rooms){c.innerHTML='<div class="empty">No joined rooms yet.</div>';return;}
 c.innerHTML='';
 Object.entries(rooms).sort((a,b)=>(b[1].joinedAt||0)-(a[1].joinedAt||0)).forEach(([k,r])=>c.innerHTML+=rcHTML(k,r,false));
 });
}

window.leaveAuctionRoom=function(rid,name){
 if(!user)return;
 if(!confirm(`Leave "${name}"? You will lose your team slot and bidding history in this room.`))return;
 remove(ref(db,`users/${user.uid}/joined/${rid}`))
 .then(()=>window.showAlert(`Left "${name}".`,'ok'))
 .catch(e=>window.showAlert(e.message));
};

window.createNewRoom=function(){
 if(!user)return;
 const name=document.getElementById('newRoomName').value.trim()||'My League';
 const budget=parseFloat(document.getElementById('newRoomBudget').value)||100;
 const maxTeams=parseInt(document.getElementById('newRoomMaxTeams').value)||6;
 const maxPlayers=parseInt(document.getElementById('newRoomMaxPlayers').value)||20;
 const maxOverseas=Math.max(2,parseInt(document.getElementById('newRoomMaxOverseas')?.value)||8);
 const nr=push(ref(db,'auctions'));
 const upd={};
 // Write to user's admin list
 upd[`users/${user.uid}/auctions/${nr.key}`]={name,budget,maxTeams,maxPlayers,maxOverseas,createdAt:Date.now()};
 // Write full config stub to auction path -- available immediately, before initialization
 upd[`auctions/${nr.key}/roomName`]=name;
 upd[`auctions/${nr.key}/budget`]=budget;
 upd[`auctions/${nr.key}/maxTeams`]=maxTeams;
 upd[`auctions/${nr.key}/maxPlayers`]=maxPlayers;
 upd[`auctions/${nr.key}/maxOverseas`]=maxOverseas;
 upd[`auctions/${nr.key}/adminUid`]=user.uid;
 upd[`auctions/${nr.key}/createdAt`]=Date.now();
 update(ref(db),upd)
 .then(()=>window.location.search=`?room=${nr.key}`)
 .catch(e=>{
 const msg = e.code === 'PERMISSION_DENIED' || (e.message||'').includes('PERMISSION_DENIED')
   ? 'Permission denied. Please check your Firebase database rules allow authenticated users to create rooms.'
   : e.message;
 window.showAlert(msg);
});
};

// -- Delete Room --
window.openDeleteModal=function(key,name){
 roomToDelete=key; roomToDeleteName=name;
 document.getElementById('deleteRoomName').textContent=`"${name}"`;
 document.getElementById('deleteModal').classList.add('open');
};
window.closeDeleteModal=function(){document.getElementById('deleteModal').classList.remove('open');roomToDelete='';};
window.confirmDeleteRoom=function(){
 if(!roomToDelete)return;
 const rid=roomToDelete;
 window.closeDeleteModal();
 // Remove from admin's list + remove the auction data
 Promise.all([
 remove(ref(db,`users/${user.uid}/auctions/${rid}`)),
 remove(ref(db,`auctions/${rid}`))
 ]).then(()=>window.showAlert('Room deleted.','ok'))
 .catch(e=>window.showAlert(e.message));
};

// -- Join Room (with team name modal) --
window.initiateJoinRoom=function(){
 let val=document.getElementById('joinRoomCode').value.trim();
 if(!val)return window.showAlert('Enter a room code or link.');
 const match=val.match(/[?&]room=([^&\s]+)/);
 const rid=match?match[1]:val;
 if(!rid)return window.showAlert('Could not find a room ID.');
 // Check room exists first
 get(ref(db,`auctions/${rid}`)).then(snap=>{
 if(!snap.exists())return window.showAlert('Room not found. Check the code.');
 // Check if already a member
 get(ref(db,`auctions/${rid}/members/${user.uid}`)).then(ms=>{
 if(ms.exists()){
 // Already registered -- just enter
 window.location.search=`?room=${rid}`;
 } else {
 // Show team name modal
 pendingJoinRoomId=rid;
 document.getElementById('modalTeamName').value='';
 document.getElementById('teamNameModal').classList.add('open');
 }
 });
 }).catch(()=>window.showAlert('Room not found. Check the code.'));
};

window.closeTeamModal=function(){
 document.getElementById('teamNameModal').classList.remove('open');
 pendingJoinRoomId='';
};

window.confirmTeamName=function(){
 const tn=document.getElementById('modalTeamName').value.trim();
 if(!tn)return window.showAlert('Enter a team name to continue.');
 if(tn.length>30)return window.showAlert('Team name must be 30 characters or less.');
 if(!pendingJoinRoomId)return;
 const rid=pendingJoinRoomId;
 get(ref(db,`auctions/${rid}`)).then(snap=>{
 const data=snap.val();
 if(!data)return window.showAlert('Room not found. Please reload the page and try again.');
 const maxTeams=data.maxTeams||data.setup?.maxTeams||null; // reads from stub OR setup
 const amAdmin=data.adminUid===user.uid||data.setup?.adminUid===user.uid||isAdmin;
 const existingMembers=data.members?Object.values(data.members):[];
 const existingTeams=data.teams?Object.keys(data.teams):[];
 // Already registered -- update in memory, close modal, refresh UI (no page reload)
 if(data.members?.[user.uid]){
 myTeamName=data.members[user.uid].teamName||'';
 pendingJoinRoomId='';
 document.getElementById('teamNameModal').classList.remove('open');
 updateMyTeamUI();
 return;
 }
 // Capacity check -- skip if auction not yet initialized (maxTeams unknown)
 // Admin is always exempt regardless
 if(!amAdmin&&maxTeams!==null&&existingTeams.length>=maxTeams){
 return window.showAlert(`This room is full -- max ${maxTeams} teams allowed.`);
 }
 // Name uniqueness
 if(existingMembers.some(m=>m.teamName?.toLowerCase()===tn.toLowerCase())){
 return window.showAlert('That team name is already taken. Choose another.');
 }
 const budget=data.setup?.budget||data.budget||100;
 const upd={};
 upd[`auctions/${rid}/members/${user.uid}`]={teamName:tn,email:user.email||'',uid:user.uid,joinedAt:Date.now()};
 upd[`auctions/${rid}/teams/${tn}`]={name:tn,budget,roster:[]};
 upd[`users/${user.uid}/joined/${rid}`]={name:data.roomName||`Room ${rid.substring(0,5).toUpperCase()}`,teamName:tn,joinedAt:Date.now()};
 // Admin also marks teamName in their admin record
 if(amAdmin) upd[`users/${user.uid}/auctions/${rid}/teamName`]=tn;
 return update(ref(db),upd).then(()=>{
 myTeamName=tn;
 pendingJoinRoomId='';
 document.getElementById('teamNameModal').classList.remove('open');
 updateMyTeamUI();
 window.showAlert(`Team "${tn}" registered! You can now bid.`,'ok');
 });
 }).catch(e=>window.showAlert(e.message));
};

// -- Update UI after team registration (admin or member) --
function updateMyTeamUI(){
 if(!myTeamName)return;
 document.getElementById('myTeamBadge').style.display='flex';
 document.getElementById('myTeamName').textContent=myTeamName;
 document.getElementById('roomRoleBadge').textContent=isAdmin?' Admin . '+myTeamName:' '+myTeamName;
}

// -- Admin team registration shortcut --
window.adminRegisterTeam=function(){
 if(!roomId)return;
 pendingJoinRoomId=roomId;
 document.getElementById('modalTeamName').value='';
 document.getElementById('teamNameModal').classList.add('open');
};

// -- Release Player --
window.openReleaseModal=function(teamName,playerIdx,playerName,soldPrice){
 releaseTeam=teamName;
 releaseIdx=playerIdx; // kept for reference but not used as array index
 releasePlayerName=playerName;
 releasePrice=soldPrice;
 document.getElementById('releasePlayerDesc').textContent=
 `${playerName} . \u20b9${(+soldPrice).toFixed(2)} Cr will be refunded to ${teamName}`;
 document.getElementById('releaseModal').classList.add('open');
};

window.closeReleaseModal=function(){
 document.getElementById('releaseModal').classList.remove('open');
 releaseTeam='';releaseIdx=-1;releasePlayerName='';releasePrice=0;
};

window.confirmRelease=function(){
 if(!roomId)return window.showAlert('You must be in a room to release a player.');
 if(!releaseTeam||!releasePlayerName)return;
 const pricePaid=parseFloat(releasePrice)||0;
 const targetName=releasePlayerName.toLowerCase().trim();

 // Always re-fetch live data from Firebase -- never use stale roomState
 get(ref(db,`auctions/${roomId}`)).then(snap=>{
 const data=snap.val();
 if(!data)return window.showAlert('Room data not found. Please reload.');

 const team=data.teams?.[releaseTeam];
 if(!team)return window.showAlert(`Team "${releaseTeam}" not found.`);

 // Normalise roster -- Firebase stores JS arrays as keyed objects {0:{},1:{},2:{}}
 // We must read ALL keys (not just Object.values order) and rebuild with explicit keys
 const rawRoster=team.roster;
 let rosterEntries=[]; // [{key, value}]
 if(!rawRoster){
 return window.showAlert(`${releaseTeam} has no players to release.`);
 } else if(Array.isArray(rawRoster)){
 rosterEntries=rawRoster.map((v,i)=>({key:String(i),value:v}));
 } else {
 rosterEntries=Object.entries(rawRoster).map(([k,v])=>({key:k,value:v}));
 }

 // Find the player by name -- match against the stored name
 const matchEntry=rosterEntries.find(e=>(e.value?.name||e.value?.n||'').toLowerCase().trim()===targetName);
 if(!matchEntry)return window.showAlert(`"${releasePlayerName}" not found in ${releaseTeam}'s roster. Try reloading the page.`);

 const actualPrice=matchEntry.value.soldPrice||pricePaid;
 const newBudget=parseFloat((team.budget+actualPrice).toFixed(2));

 // Build the new roster object WITHOUT the released player key
 // Using explicit null on the old key removes it; remaining keys stay indexed
 const rosterRef=ref(db,`auctions/${roomId}/teams/${releaseTeam}/roster`);
 // Rebuild as a clean indexed object (re-index from 0 to avoid gaps)
 const remaining=rosterEntries.filter(e=>e.key!==matchEntry.key).map(e=>e.value);
 // remaining is a JS array -- use set() to REPLACE (not merge) the roster entirely
 // This eliminates the stale-key merge bug that update() has with arrays/objects

 // Find the player in the global players list to reset their auction status
 const allPlayers=data.players?Object.values(data.players):[];
 const dbPlayer=allPlayers.find(p=>(p.name||p.n||'').toLowerCase().trim()===targetName);

 // Step 1: set() the roster (full replace -- eliminates merge issues)
 const rosterWrite = remaining.length >0
 ? set(rosterRef, remaining)
 : remove(rosterRef); // empty roster = delete the key entirely

 rosterWrite.then(()=>{
 // Step 2: update budget + player status atomically
 const upd={};
 upd[`auctions/${roomId}/teams/${releaseTeam}/budget`]=newBudget;
 if(dbPlayer!==undefined){
 const pid=String(dbPlayer.id);
 upd[`auctions/${roomId}/players/${pid}/status`]='available';
 upd[`auctions/${roomId}/players/${pid}/soldTo`]=null;
 upd[`auctions/${roomId}/players/${pid}/soldPrice`]=null;
 }
 return update(ref(db),upd);
 }).then(()=>{
 window.closeReleaseModal();
 window.showAlert(`${releasePlayerName} released. \u20b9${actualPrice.toFixed(2)} Cr refunded to ${releaseTeam}.`,'ok');
 }).catch(e=>window.showAlert('Release failed: '+e.message));
 }).catch(e=>window.showAlert('Could not read room data: '+e.message));
};

window.backToDashboard=function(){
 if(roomListener){roomListener();roomListener=null;}
 history.replaceState({},'',window.location.pathname);
 loadDash();
};

window.copyInviteLink=function(){
 const url=`${location.origin}${location.pathname}?room=${roomId}`;
 navigator.clipboard.writeText(url).then(()=>window.showAlert('Invite link copied!','ok')).catch(()=>window.showAlert('Copy failed -- share this link manually: '+url,'info'));
};

// -- Auction Room --
function loadRoom(rid){
 showInner('auction-view');
 roomId=rid; isAdmin=false; myTeamName='';

 // Resolve admin status and team name
 Promise.all([
 get(ref(db,`users/${user.uid}/auctions/${rid}`)),
 get(ref(db,`auctions/${rid}/members/${user.uid}`))
 ]).then(([adminSnap,memberSnap])=>{
 isAdmin=adminSnap.exists();

 if(memberSnap.exists()){
 myTeamName=memberSnap.val().teamName||'';
 }

 document.getElementById('roomRoleBadge').textContent=isAdmin?' Admin':' '+(myTeamName||'Member');
 document.getElementById('roomRoleBadge').className=`badge ${isAdmin?'bg':'bb'}`;
 var _lbA=document.getElementById('mt_lock_btn_A'); if(_lbA&&isAdmin){ _lbA.style.display='inline-block'; if(roomState){ _lbA.textContent=roomState.squadLocked?'Unlock Changes':'Lock Changes'; _lbA.style.background=roomState.squadLocked?'var(--err-bg)':'var(--g1)'; _lbA.style.color=roomState.squadLocked?'var(--err)':'var(--txt2)'; } }

 // Admin-only controls
 document.getElementById('adminPullControls').style.display=isAdmin?'block':'none';
 document.getElementById('adminRandomBtn').style.display=isAdmin?'block':'none';
 document.getElementById('adminSoldControls').style.display=isAdmin?'block':'none';

 // Show "bidding as" badge for EVERYONE once registered (admin + members)
 if(myTeamName){
 document.getElementById('myTeamBadge').style.display='flex';
 document.getElementById('myTeamName').textContent=myTeamName;
 document.getElementById('roomRoleBadge').textContent=isAdmin?' Admin . '+myTeamName:' '+myTeamName;
 }

 // Populate setupConfigBox and initHintMax from admin record (available immediately)
 // Show match entry card for admin
 document.getElementById('addMatchCard').style.display=isAdmin?'block':'none';
 const mdNote=document.getElementById('matchDataAdminNote');
 if(mdNote) mdNote.textContent=isAdmin?'Admin -- click any field to edit':'View only';

 if(isAdmin){
 const adminMeta=adminSnap.val();
 const mt=adminMeta?.maxTeams||4;
 const mp=adminMeta?.maxPlayers||20;
 const bg=adminMeta?.budget||100;
 const rn=adminMeta?.name||`Room ${rid.substring(0,5).toUpperCase()}`;
 const cfgBox=document.getElementById('setupConfigBox');
 if(cfgBox) cfgBox.innerHTML=`<div class="setup-stat-grid"><div class="setup-stat"><div class="setup-stat-val">${rn}</div><div class="setup-stat-lbl">Room Name</div></div><div class="setup-stat"><div class="setup-stat-val" style="color:var(--accent)">\u20b9${bg}</div><div class="setup-stat-lbl">Budget / Team (Cr)</div></div><div class="setup-stat"><div class="setup-stat-val">${mt}</div><div class="setup-stat-lbl">Max Teams</div></div><div class="setup-stat"><div class="setup-stat-val">${mp}</div><div class="setup-stat-lbl">Players / Team</div></div></div>`;+
 `Budget: <strong style="color:var(--accent)">\u20b9${bg} Cr/team</strong>&nbsp;.&nbsp; `+
 `Max Teams: <strong style="color:var(--accent)">${mt}</strong>&nbsp;.&nbsp; `+
 `Max Players/Team: <strong style="color:var(--accent)">${mp}</strong>`;
 const ihm=document.getElementById('initHintMax');
 if(ihm) ihm.textContent=mt;
 }

 // Both admin AND members get the team name modal if they haven't registered yet
 if(!memberSnap.exists()){
 setTimeout(()=>{
 pendingJoinRoomId=rid;
 document.getElementById('modalTeamName').value='';
 document.getElementById('teamNameModal').classList.add('open');
 },400);
 }

 if(!isAdmin){
 document.getElementById('btn-setup').style.display='none';
 document.getElementById('setup-tab').style.display='none';
 window.switchTab('auction');
 }

 // Attach onValue INSIDE Promise.all so isAdmin is always set before first render
 if(roomListener){roomListener();roomListener=null;}
 roomListener=onValue(ref(db,`auctions/${rid}`),snap=>{
 const data=snap.val();
 if(!data)return;
 roomState=data;
 document.getElementById('roomTitleDisplay').textContent=data.roomName||`Room ${rid.substring(0,5).toUpperCase()}`;

 // Auto-switch from setup tab once initialized
 if(data.setup?.isStarted){
 document.getElementById('btn-setup').style.display='none';
 document.getElementById('setup-tab').style.display='none';
 document.getElementById('statsRow').style.display='flex';
 if(document.getElementById('btn-setup').classList.contains('active'))window.switchTab('auction');
 }

 // Stats
 if(data.players){
 const ps=Object.values(data.players);
 document.getElementById('stat-total').textContent=ps.length;
 document.getElementById('stat-avail').textContent=ps.filter(p=>p.status==='available').length;
 document.getElementById('stat-sold').textContent=ps.filter(p=>p.status==='sold').length;
 document.getElementById('stat-unsold').textContent=ps.filter(p=>p.status==='unsold').length;
 document.getElementById('stat-teams').textContent=data.teams?Object.keys(data.teams).length:'--';
 }

 // -- Setup tab: join progress + config summary + init button gating --
 {
 const members=data.members?Object.values(data.members):[];
 // maxTeams reads from stub (top-level) OR setup (post-init)
 const maxTeams=data.maxTeams||data.setup?.maxTeams||4;
 const maxPlayers=data.maxPlayers||data.setup?.maxPlayers||20;
 const maxOverseas=data.maxOverseas||data.setup?.maxOverseas||8;
 const budget=data.budget||data.setup?.budget||100;
 const roomName=data.roomName||`Room ${roomId.substring(0,5).toUpperCase()}`;

 // Count badge
 const badge=document.getElementById('memberCountBadge');
 if(badge) badge.textContent=`${members.length} / ${maxTeams}`;

 if(isAdmin){
 // Config summary box
 const cfgBox=document.getElementById('setupConfigBox');
 if(cfgBox) cfgBox.innerHTML=`<div class="setup-stat-grid"><div class="setup-stat"><div class="setup-stat-val">${roomName}</div><div class="setup-stat-lbl">Room Name</div></div><div class="setup-stat"><div class="setup-stat-val" style="color:var(--accent)">\u20b9${budget}</div><div class="setup-stat-lbl">Budget / Team (Cr)</div></div><div class="setup-stat"><div class="setup-stat-val">${maxTeams}</div><div class="setup-stat-lbl">Max Teams</div></div><div class="setup-stat"><div class="setup-stat-val">${maxPlayers}</div><div class="setup-stat-lbl">Players / Team</div></div><div class="setup-stat"><div class="setup-stat-val">${maxOverseas||8}</div><div class="setup-stat-lbl">Max Overseas</div></div></div>`;+
 `Budget: <strong style="color:var(--accent)">\u20b9${budget} Cr/team</strong>&nbsp;.&nbsp; `+
 `Max Teams: <strong style="color:var(--accent)">${maxTeams}</strong>&nbsp;.&nbsp; `+
 `Max Players/Team: <strong style="color:var(--accent)">${maxPlayers}</strong>`;

 // Admin slot: admin counts even before registering their name
 const adminHasTeam=data.members?.[user.uid];
 const effectiveJoined=adminHasTeam?members.length:members.length+1;
 const full=effectiveJoined>=maxTeams;
 const canInit=full&&!!adminHasTeam&&!data.setup?.isStarted;
 const pct=maxTeams>0?Math.min(100,Math.round(effectiveJoined/maxTeams*100)):0;

 // Progress bar
 const jpCount=document.getElementById('jpCount');
 const jpFill=document.getElementById('jpBarFill');
 const jpStatus=document.getElementById('jpStatus');
 if(jpCount) jpCount.textContent=`${effectiveJoined} / ${maxTeams}`;
 if(jpFill) jpFill.style.width=pct+'%';
 if(jpStatus){
 if(data.setup?.isStarted){
 jpStatus.style.color='var(--ok)';
 jpStatus.textContent='Auction is live!';
 } else if(full&&!adminHasTeam){
 jpStatus.style.color='var(--accent)';
 jpStatus.textContent=' \ufe0f All teams joined -- register your team above to unlock!';
 } else if(full){
 jpStatus.style.color='var(--ok)';
 jpStatus.textContent=`All ${maxTeams} teams joined -- ready to initialize!`;
 } else {
 jpStatus.style.color='var(--dim2)';
 const waiting=maxTeams-effectiveJoined;
 jpStatus.textContent=`Waiting for ${waiting} more team${waiting===1?'':'s'} to join...`;
 }
 }

 // Init button state
 const initBtn=document.getElementById('initBtn');
 const initHintMax=document.getElementById('initHintMax');
 if(initHintMax) initHintMax.textContent=maxTeams;
 if(initBtn){
 initBtn.disabled=!canInit;
 if(data.setup?.isStarted){
 initBtn.textContent='Auction Initialized -- Live';
 } else if(full&&!adminHasTeam){
 initBtn.textContent='Initialize Auction -- Register your team first';
 } else if(full){
 initBtn.textContent=`Initialize Auction (${maxTeams} teams ready)`;
 } else {
 initBtn.textContent=`Initialize Auction -- Waiting (${effectiveJoined}/${maxTeams} joined)`;
 }
 }

 // Admin register banner
 const banner=document.getElementById('adminRegBanner');
 if(banner) banner.style.display=(!data.setup?.isStarted&&!adminHasTeam)?'block':'none';

 // Members list
 const ml=document.getElementById('membersList');
 if(ml){
 if(members.length){
 ml.innerHTML='<div class="member-grid">'+members.map((m,i)=>{
 const isMe=m.uid===user.uid;
 const initials=(m.teamName||'?').substring(0,2).toUpperCase();
 return `<div class="member-card${isMe?' you':''}">
  <div class="member-avatar">${initials}</div>
  <div class="member-info">
   <div class="member-team-name">${m.teamName||''}${isMe?'<span class="member-you-badge">You</span>':''}</div>
   <div class="member-email-sm">${m.email||''}</div>
  </div>
 </div>`;
}).join('')+'</div>';
 } else {
 ml.innerHTML='<div class="empty">No teams yet -- share the invite link!</div>';
 }
 }
 }
 }

 // Teams (Purses tab)
 if(data.teams){
 const ts=document.getElementById('winningTeamSelect');
 if(ts){ts.innerHTML='<option value="">-- Select Winner --</option>';}
 const prev=ts?ts.value:'';
 document.getElementById('teamGrid').innerHTML='';
 Object.values(data.teams).forEach(team=>{
 if(ts){const o=document.createElement('option');o.value=team.name;o.textContent=team.name;ts.appendChild(o);}
 const roster=Array.isArray(team.roster)?team.roster:(team.roster&&typeof team.roster==='object'?Object.values(team.roster):[]);
 document.getElementById('teamGrid').innerHTML+=
`<div class="tcard"><div class="tcard-hdr">
<div class="tcard-hdr-top"><div class="tname">${team.name}</div></div>
<div class="tcard-pills">
 <div class="tpill purse-left"><div class="tpill-val">\u20b9${team.budget.toFixed(1)}</div><div class="tpill-lbl">Purse Left</div></div>
 <div class="tpill purse-spent"><div class="tpill-val">\u20b9${(roster.reduce((s,p)=>s+(p.soldPrice||0),0)).toFixed(1)}</div><div class="tpill-lbl">Spent</div></div>
 <div class="tpill purse-players"><div class="tpill-val">${roster.length}</div><div class="tpill-lbl">Sold</div></div>
 <div class="tpill purse-remaining"><div class="tpill-val">${(data.setup?.maxPlayers||20)-roster.length}</div><div class="tpill-lbl">Slots Left</div></div>
</div></div>${roster.length
 ?`<ul class="troster">${roster.map((p,pi)=>`<li><div style="flex:1;min-width:0;"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name||p.n||'--'}<span class="iplteam-pill">${p.iplTeam||p.t||''}</span></div><div class="rrole">${p.role||p.r||''} . \u20b9${(p.soldPrice||0).toFixed(2)} Cr</div></div><button class="rel-btn" onclick="window.openReleaseModal('${team.name}',${pi},'${(p.name||p.n||'').replace(/'/g,"\'")}',${p.soldPrice||0})"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Release</button></li>`).join('')}</ul>`
 :'<div class="empty">No players yet</div>'}
 </div>`;
 });
 if(ts&&prev)ts.value=prev;
 }

 // Players (dropdown + ledger)
 if(data.players){
 const all=Object.values(data.players);
 cachedAllPlayers=all;
 const sel=document.getElementById('manualPlayerSelect'),prevSel=sel.value;
 sel.innerHTML='<option value="">-- Select player --</option>';
 all.filter(p=>p.status==='available'||p.status==='unsold').sort((a,b)=>N(a).localeCompare(N(b))).forEach(p=>{
 const o=document.createElement('option');
 o.value=String(p.id);
 o.textContent=`${N(p)} (${T(p)})${p.status==='unsold'?' \u21a9':''}`;
 sel.appendChild(o);
 });
 if(prevSel)sel.value=prevSel;
 document.getElementById('rosterCount').textContent=`${all.length} players`;
 renderLedger(all);
 }

 // Auction block

 if(data.players&&roomId){ var _ap=Array.isArray(data.players)?data.players:Object.values(data.players||{}); if(!_ap.some(function(p){return(p.name||p.n||'').indexOf('Dasun Shanaka')>=0;})){ _ap.push({name:"Dasun Shanaka* (SL)",n:"Dasun Shanaka* (SL)",iplTeam:"RR",t:"RR",role:"All-rounder",r:"All-rounder",isOverseas:true,o:true,status:"unsold",basePrice:2}); data.players=_ap; set(ref(db,'auctions/'+roomId+'/players'),_ap).catch(function(){}); } }
 renderBlock(data);

 // Points tabs -- always re-render when data changes
 renderPointsTab();
 renderLeaderboard(data);
 renderAnalytics(data);
 if(document.getElementById('myteam-tab')?.style.display==='block') _mtRenderA();
 else if(myTeamName && data.teams && data.teams[myTeamName]) {
   var _newRLen=0; var _r=data.teams[myTeamName].roster;
   if(_r) _newRLen=Array.isArray(_r)?_r.length:Object.keys(_r).length;
   if(!_sqSavedA||!_sqSavedA._rLen||_sqSavedA._rLen!==_newRLen){ _sqSavedA=null; }
  }
 renderMatchData(data);
 window.renderTrades(data);
 var _lBtn=document.getElementById('mt_lock_btn_A'); if(_lBtn){ if(isAdmin) _lBtn.style.display='inline-block'; _lBtn.textContent=data.squadLocked?'Unlock Changes':'Lock Changes'; _lBtn.style.background=data.squadLocked?'var(--err-bg)':'var(--g1)'; _lBtn.style.color=data.squadLocked?'var(--err)':'var(--txt2)'; }
 if(document.getElementById('trades-tab')?.style.display==='block') window.loadTradeDropdowns();
 });
 }); // end Promise.all .then()
}

function renderBlock(data){
 const blk=document.getElementById('auctionBlockDisplay');
 const ctrl=document.getElementById('biddingControls');
 const strip=document.getElementById('bidderStrip');

 // -- Live members bar --
 if(data.members){
 const members=Object.values(data.members);
 const bar=document.getElementById('liveMembersBar');
 const list=document.getElementById('liveMembersList');
 if(members.length){
 bar.style.display='block';
 list.innerHTML=members.map(m=>{
 const isMe=m.uid===user.uid;
 return`<span class="badge ${isMe?'bpu':'bb'}" style="font-size:.78rem;padding:5px 10px;">${m.teamName}${isMe?' v':''}
 </span>`;
 }).join('');
 }
 }

 if(data.currentBlock?.active){
 const pid=String(data.currentBlock.playerId);
 const p=data.players?.[pid]||data.players?.[parseInt(pid)];
 if(!p){blk.innerHTML=`<div style="color:var(--dim)">Player not found (id:${pid}). Try re-initializing.</div>`;ctrl.style.display='none';return;}

 blk.classList.add('live');
 ctrl.style.display='block';
 document.getElementById('liveBidText').textContent=`\u20b9${data.currentBlock.currentBid.toFixed(2)}`;

 const m=data.setup?.budgetMultiplier||1;
 document.getElementById('quickBidGrid').innerHTML=
 (()=>{
  const curBid=data.currentBlock?.currentBid||0;
  const myTeamData=roomState?.teams?.[myTeamName];
  const myTeamBudget=myTeamData?.budget??Infinity;
  const alreadyNI=!!(data.currentBlock?.notInterested?.[myTeamName]);
  const amLastBidder=data.currentBlock?.lastBidderTeam===myTeamName;
  const maxPl=roomState?.setup?.maxPlayers||roomState?.maxPlayers||20;
  const myRosterLen=(Array.isArray(myTeamData?.roster)?myTeamData.roster:(myTeamData?.roster?Object.values(myTeamData.roster):[])).length;
  const rosterFull=myRosterLen>=maxPl;
  // Check overseas limit for current player on block
  const blockPlayer=Object.values(roomState?.players||{}).find(p=>String(p.id)===String(data.currentBlock?.playerId));
  const blockIsOverseas=!!(blockPlayer?.isOverseas);
  const myOsCount=myRosterLen>0?(Array.isArray(myTeamData?.roster)?myTeamData.roster:Object.values(myTeamData?.roster||{})).filter(p=>p.isOverseas||p.o).length:0;
  const osLimitBid=roomState?.maxOverseas||roomState?.setup?.maxOverseas||8;
  const osLimitHit=blockIsOverseas&&myOsCount>=osLimitBid;
  // Auto-NI: current bid exceeds purse OR squad full OR overseas limit hit
  if(!alreadyNI&&!amLastBidder&&myTeamName){
    const shouldAutoNI=(curBid>myTeamBudget)||rosterFull||osLimitHit;
    if(shouldAutoNI){
      update(ref(db,`auctions/${roomId}/currentBlock/notInterested`),{[myTeamName]:true}).catch(()=>{});
    }
  }
  return [0.1,0.5,1,2,5,10].map(i=>{
    const amt=+(i*m).toFixed(2);
    const lbl='+\u20b9'+(amt<1?amt.toFixed(2):amt.toFixed(1));
    const tooSmall=amt<0.2&&curBid>=3;
    const cantAfford=!amLastBidder&&(curBid+amt)>myTeamBudget;
    const quotaFull=(rosterFull||osLimitHit)&&!amLastBidder;
    const blocked=tooSmall||cantAfford||alreadyNI||quotaFull;
    const title=osLimitHit&&!rosterFull?`Overseas limit reached (${myOsCount}/${osLimitBid})`:quotaFull?`Squad full (${myRosterLen}/${maxPl} players)`:tooSmall?'Not allowed above \u20b93 Cr':cantAfford?`Exceeds your budget (\u20b9${myTeamBudget.toFixed(2)} Cr left)`:'';
    return `<button class="qbtn${blocked?' qbtn-blocked':''}" ${blocked?'disabled':''}${title?` title="${title}"`:''}  onclick="window.addBid(${amt})">${lbl}${(cantAfford||quotaFull)?'<span style=\"font-size:.60rem;margin-left:3px;opacity:.6;\">x</span>':''}</button>`;
  }).join('');
})();

 blk.innerHTML=`
 <div class="pname">${N(p)}</div><div class="ptags"><span class="ptag">${T(p)}</span><span class="ptag">${R(p)}</span><span class="ptag ${O(p)?'ov':'in'}">${O(p)?'Overseas':'Indian'}</span></div><div class="base-lbl">Base Price: \u20b9${(p.basePrice||0).toFixed(2)} Cr</div>`;

 // Live bidder strip
 if(data.currentBlock.lastBidderName){
 strip.classList.add('show');
 document.getElementById('bidderName').textContent=data.currentBlock.lastBidderName;
 } else {
 strip.classList.remove('show');
 }

 // -- Not Interested logic --
 const allMembers=data.members?Object.values(data.members):[];
 const totalTeams=allMembers.length;
 const niRaw=data.currentBlock.notInterested||{};
 // notInterested stored as {teamName: true, ...}
 const niTeams=Object.keys(niRaw).filter(k=>niRaw[k]===true);
 const hasBid=!!data.currentBlock.lastBidderTeam; // at least one bid placed

 // Show Not Interested strip
 const niStrip=document.getElementById('niStrip');
 const niTeamsList=document.getElementById('niTeamsList');
 if(niTeams.length>0){
 niStrip.classList.add('show');
 niTeamsList.innerHTML=niTeams.map(t=>`<span class="ni-team-badge">${t}</span>`).join('');
 } else {
 niStrip.classList.remove('show');
 if(niTeamsList)niTeamsList.innerHTML='';
 }

 // Show/hide Not Interested button (ALL registered teams including admin)
 const niControls=document.getElementById('niControls');
 const niBtn=document.getElementById('niBtn');
 if(myTeamName){
 niControls.style.display='block';
 const alreadyPressed=niRaw[myTeamName]===true;
 const iAmLastBidder=data.currentBlock.lastBidderTeam===myTeamName;
 if(alreadyPressed){
 niBtn.textContent=' Not Interested (opted out)';
 niBtn.className='ni-btn pressed';
 niBtn.onclick=null;
 } else if(iAmLastBidder){
 // Current highest bidder can't press not interested
 niBtn.textContent=' You are the highest bidder';
 niBtn.className='ni-btn pressed';
 niBtn.style.background='rgba(16,185,129,.1)';
 niBtn.style.color='var(--ok)';
 niBtn.style.borderColor='rgba(16,185,129,.3)';
 niBtn.onclick=null;
 } else {
 niBtn.textContent=' Not Interested';
 niBtn.className='ni-btn';
 niBtn.style.background='';niBtn.style.color='';niBtn.style.borderColor='';
 niBtn.onclick=window.pressNotInterested;
 }
 } else {
 if(niControls)niControls.style.display='none';
 }

 // -- Auto-sell check: if bid placed AND only 1 team left not opted out --
 if(hasBid&&isAdmin&&totalTeams>0){
 const lastBidder=data.currentBlock.lastBidderTeam;
 // Build full interested list: all members + admin team (if registered) who haven't pressed NI
 const allTeamNames=new Set(allMembers.map(m=>m.teamName).filter(Boolean));
 if(myTeamName) allTeamNames.add(myTeamName); // include admin's team
 const interestedTeams=[...allTeamNames].filter(tn=>!niRaw[tn]);
 // If exactly 1 team is interested AND they are the last bidder -> auto sell
 if(interestedTeams.length===1&&interestedTeams[0]===lastBidder&&!autoSellInProgress){
 // Trigger auto-sell once -- flag prevents re-triggering on subsequent onValue fires
 autoSellInProgress=true;
 window.showAlert(`All others opted out -- auto-selling to ${lastBidder}!`,'ok');
 setTimeout(()=>{ window.sellPlayer(true); autoSellInProgress=false; },800);
 }
 }

 // Sold preview for admin -- shows who will get the player
 if(isAdmin){
 const preview=document.getElementById('soldPreview');
 const previewName=document.getElementById('soldPreviewName');
 if(data.currentBlock.lastBidderTeam){
 preview.style.display='block';
 previewName.textContent=`${data.currentBlock.lastBidderTeam} @ \u20b9${data.currentBlock.currentBid.toFixed(2)} Cr`;
 } else {
 preview.style.display='none';
 }
 }
 } else {
 blk.classList.remove('live');
 ctrl.style.display='none';
 strip.classList.remove('show');
 autoSellInProgress=false;
 // Hide NI controls when no active block
 const niC=document.getElementById('niControls');if(niC)niC.style.display='none';
 const niS=document.getElementById('niStrip');if(niS)niS.classList.remove('show');
 if(isAdmin){const p=document.getElementById('soldPreview');if(p)p.style.display='none';}
 const la=data.currentBlock?.lastAction;
 if(la==='unsold'){
 blk.innerHTML=`<div style="font-family:var(--f);font-size:2.8rem;color:var(--err)">\u274c UNSOLD</div>`;
 } else if(la?.startsWith('sold')){
 const pts=la.split('_');
 blk.innerHTML=`
 <div style="font-family:var(--f);font-size:2.8rem;color:var(--ok)">SOLD</div><div style="margin-top:8px;color:var(--dim2)">To <strong style="color:var(--txt)">${pts[2]}</strong></div><div style="font-family:var(--f);font-size:2rem;color:var(--accent);margin-top:4px">\u20b9${parseFloat(pts[3]).toFixed(2)} Cr</div>`;
 } else {
 blk.innerHTML=`<div style="color:var(--dim);padding:20px 0">Ready -- pull a player to begin.</div>`;
 }
 }
}

// -- Ledger --
function renderLedger(all){
 const q=(document.getElementById('searchInp')?.value||'').toLowerCase();
 const roleF=document.getElementById('filterRole')?.value||'';
 const statusF=document.getElementById('filterStatus')?.value||'';
 let rows=[...all];
 if(q)rows=rows.filter(p=>N(p).toLowerCase().includes(q)||T(p).toLowerCase().includes(q));
 if(roleF)rows=rows.filter(p=>R(p)===roleF);
 const teamF=document.getElementById('filterIPLTeam')?.value||'';
 if(teamF)rows=rows.filter(p=>T(p)===teamF);
 if(statusF)rows=rows.filter(p=>p.status===statusF);
 const originF=document.getElementById('filterOrigin')?.value||'';
 if(originF==='Indian')rows=rows.filter(p=>!O(p));
 else if(originF==='Overseas')rows=rows.filter(p=>O(p));
 rows.sort((a,b)=>N(a).localeCompare(N(b)));
 document.getElementById('rosterTbody').innerHTML=rows.map((p,i)=>{
 const sc=p.status==='available'?'<span class="badge bb">Available</span>':p.status==='unsold'?'<span class="badge br">Unsold</span>':'<span class="badge bs">Sold</span>';
 return`<tr><td style="color:var(--dim)">${i+1}</td><td style="font-weight:600">${N(p)}</td><td><span class="badge bg">${T(p)}</span></td><td>${R(p)}</td><td style="font-size:.78rem;color:var(--dim2)">${O(p)?' \ufe0f Overseas':' Indian'}</td><td>\u20b9${(p.basePrice||0).toFixed(2)}</td><td>${sc}</td><td style="color:var(--accent-l);font-weight:700">${p.soldPrice?'\u20b9'+p.soldPrice.toFixed(2):'--'}</td><td style="color:var(--dim2)">${p.soldTo||'--'}</td></tr>`;
 }).join('');
}

window.filterLedger=function(){if(cachedAllPlayers)renderLedger(cachedAllPlayers);};

// -- CSV Download --
window.downloadCSV=function(){
 if(!cachedAllPlayers||!cachedAllPlayers.length)return window.showAlert('No player data to export yet.','err');
 const headers=['#','Player','IPL Team','Role','Type','Base Price (Cr)','Status','Sold Price (Cr)','Buyer'];
 const rows=cachedAllPlayers
 .slice()
 .sort((a,b)=>N(a).localeCompare(N(b)))
 .map((p,i)=>[
 i+1,
 `"${N(p)}"`,
 T(p),
 R(p),
 O(p)?'Overseas':'Indian',
 (p.basePrice||0).toFixed(2),
 p.status,
 p.soldPrice?p.soldPrice.toFixed(2):'',
 p.soldTo||''
 ]);
 const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
 const blob=new Blob([csv],{type:'text/csv'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;
 const roomName=(roomState?.roomName||'auction').replace(/[^a-z0-9]/gi,'_');
 a.download=`${roomName}_ledger.csv`;
 a.click();
 URL.revokeObjectURL(url);
 window.showAlert('CSV downloaded!','ok');
};

// -- Tab switching --
window.switchTab=function(t){
 ['setup','auction','teams','roster','points','leaderboard','players-season','analytics','matches','myteam','schedule','trades'].forEach(id=>{
 const el=document.getElementById(`${id}-tab`);
 const btn=document.getElementById(`btn-${id}`);
 if(!el||!btn)return;
 const on=id===t;
 el.style.display=on?'block':'none';
 btn.classList.toggle('active',on);
 try{
  if(on&&id==='players-season'&&roomState) renderPlayersSeason(roomState);
  if(on&&id==='myteam') window.renderMyTeamA();
  if(on&&id==='schedule') window.renderSchedule();
  if(on&&id==='analytics'&&roomState) renderAnalytics(roomState);
  if(on&&id==='trades'&&roomState) window.loadTradeDropdowns();
 }catch(e){ console.error('switchTab render error:',e); }
 });
};

// -- Setup --
// generateTeamInputs removed -- team names are now set by participants on join, not pre-configured by admin

window.initializeAuctionData=function(){
 if(!roomId||!user)return;
 if(!confirm('This will initialize the auction and load 250 players. Are you sure?'))return;
 // Read config from the auction stub (written at room creation)
 get(ref(db,`auctions/${roomId}`)).then(snap=>{
 const stub=snap.val()||{};
 const maxTeams=stub.maxTeams||4;
 const maxP=stub.maxPlayers||20;
 const meta=stub; // stub IS the meta now
 if(!stub.roomName&&!stub.adminUid)return window.showAlert('Room data missing. Please reload.');
 const budget=parseFloat(stub.budget)||100,mul=budget/100;
 const dbP={};
 rawData.forEach((p,i)=>{
 const base=p.o?0.5:(p.r==='All-rounder'||p.r==='All-Rounder')?0.3:0.2;
 dbP[i]={id:i,name:p.n,role:p.r,isOverseas:p.o,iplTeam:p.t,basePrice:parseFloat((base*mul).toFixed(2)),status:'available',soldTo:null,soldPrice:null};
 });
 // Teams start EMPTY -- each member creates their own when they join
 // Preserve existing members + already-registered teams if re-initializing
 return get(ref(db,`auctions/${roomId}/members`)).then(mSnap=>{
 const existingMembers=mSnap.val()||{};
 // Rebuild teams from existing members so re-init doesn't wipe rosters if teams already registered
 const dbT={};
 Object.values(existingMembers).forEach(m=>{
 if(m.teamName){
 dbT[m.teamName]=dbT[m.teamName]||{name:m.teamName,budget,roster:[]};
 }
 });
 return set(ref(db,`auctions/${roomId}`),{
 roomName:stub.roomName||stub.name||`Room ${roomId.substring(0,5).toUpperCase()}`,
 // Preserve top-level stub fields so confirmTeamName always finds them
 budget,maxTeams,maxPlayers:maxP,adminUid:user.uid,
 setup:{isStarted:true,maxPlayers:maxP,maxTeams,budgetMultiplier:mul,budget,adminUid:user.uid},
 players:dbP,
 teams:Object.keys(dbT).length?dbT:{},
 currentBlock:{active:false,lastAction:null,lastBidderName:null,lastBidderTeam:null},
 members:existingMembers
 });
 });
 }).then(()=>window.showAlert('250 players loaded! Share the invite link so teams can join.','ok')).catch(e=>window.showAlert(e.message));
};

// -- Auction actions --
window.pullRandomPlayer=async function(){
 if(!roomState?.players)return window.showAlert('Auction not initialized yet.');
 const av=Object.values(roomState.players).filter(p=>p.status==='available');
 if(!av.length){
  // Check if there are unsold players to re-auction
  const unsoldPlayers=Object.values(roomState.players).filter(p=>p.status==='unsold');
  if(!unsoldPlayers.length) return window.showAlert('All players have been sold! Auction complete.','info');
  // Re-open unsold players for re-auction
  if(!confirm(`All available players have been auctioned. ${unsoldPlayers.length} unsold player${unsoldPlayers.length===1?'':'s'} will now re-enter the auction. Continue?`)) return;
  const reUpd={};
  unsoldPlayers.forEach(p=>{ reUpd[`/players/${p.id}/status`]='available'; });
  await update(ref(db,`auctions/${roomId}`),reUpd);
  window.showAlert(`${unsoldPlayers.length} unsold player${unsoldPlayers.length===1?'':'s'} re-entered the auction!`,'ok');
  return;
 }
 const p=av[Math.floor(Math.random()*av.length)];
 update(ref(db,`auctions/${roomId}/currentBlock`),{active:true,playerId:p.id,currentBid:p.basePrice,lastBidderName:null,lastBidderTeam:null,notInterested:null});
};

window.pullSpecificPlayer=function(){
 const sid=document.getElementById('manualPlayerSelect').value;
 if(!sid)return window.showAlert('Select a player first.');
 if(!roomState?.players)return;
 const p=roomState.players[sid]||roomState.players[parseInt(sid)];
 if(!p)return window.showAlert('Player not found.');
 update(ref(db,`auctions/${roomId}/currentBlock`),{active:true,playerId:p.id,currentBid:p.basePrice,lastBidderName:null,lastBidderTeam:null,notInterested:null});
};

// -- Not Interested --
window.pressNotInterested=function(){
 if(!roomState?.currentBlock?.active)return;
 if(!myTeamName)return window.showAlert('Register your team first.','err');
 const lastBidder=roomState.currentBlock?.lastBidderTeam;
 if(lastBidder===myTeamName)return window.showAlert("You are the highest bidder -- you can't opt out!","err");
 // Write notInterested flag for this team
 update(ref(db,`auctions/${roomId}/currentBlock/notInterested`),{[myTeamName]:true})
 .catch(e=>window.showAlert(e.message));
};

// -- Bid (everyone can bid -- writes team name to Firebase for live display + auto-sell) --
window.addBid=function(inc){
 if(!roomState?.currentBlock?.active)return window.showAlert('No player on the block yet.','err');
 if(!myTeamName)return window.showAlert('Register your team first before bidding. Use the Setup tab.','err');
 const curBid=roomState.currentBlock.currentBid||0;
 // Minimum increment rule: once price crosses \u20b93Cr, no 0.1 increments allowed
 if(inc<0.2&&curBid>=3)return window.showAlert('Bids of \u20b90.10 Cr are not allowed above \u20b93 Cr. Use \u20b90.50 Cr or higher.','err');
 const newBid=parseFloat((curBid+inc).toFixed(2));
 const myTeam=roomState.teams?.[myTeamName];
 // Quota check: cannot bid if roster is full
 const maxP=roomState.setup?.maxPlayers||roomState.maxPlayers||20;
 const myRoster=Array.isArray(myTeam?.roster)?myTeam.roster:(myTeam?.roster?Object.values(myTeam.roster):[]);
 if(myRoster.length>=maxP)return window.showAlert(`Your squad is full (${maxP}/${maxP} players). You cannot bid on more players.`,'err');
 // Overseas limit check: max 8 overseas players per squad
 const blockPid=String(roomState.currentBlock?.playerId);
 const blockPlayer=roomState.players?.[blockPid]||Object.values(roomState.players||{}).find(p=>String(p.id)===blockPid);
 if(blockPlayer?.isOverseas){
  const myOsCount=myRoster.filter(p=>p.isOverseas||p.o).length;
  const osLimitBid=roomState.maxOverseas||roomState.setup?.maxOverseas||8;
  if(myOsCount>=osLimitBid){
   if(roomState.currentBlock?.lastBidderTeam!==myTeamName) update(ref(db,`auctions/${roomId}/currentBlock/notInterested`),{[myTeamName]:true}).catch(()=>{});
   return window.showAlert(`Overseas limit reached (${myOsCount}/${osLimitBid}) -- you cannot bid on overseas players.`,'err');
  }
 }
 // Purse check: cannot bid beyond remaining budget
 const myBudget=myTeam?.budget??Infinity;
 if(newBid>parseFloat(myBudget.toFixed(2))){
  window.showAlert(`You only have \u20b9${myBudget.toFixed(2)} Cr left -- cannot bid \u20b9${newBid.toFixed(2)} Cr. Marking you as Not Interested.`,'err');
  // Auto-mark as not interested
  if(roomState.currentBlock?.lastBidderTeam!==myTeamName){
   update(ref(db,`auctions/${roomId}/currentBlock/notInterested`),{[myTeamName]:true}).catch(()=>{});
  }
  return;
 }
 const bidder=myTeamName||'Unknown';
 update(ref(db,`auctions/${roomId}/currentBlock`),{
  currentBid:newBid,
  lastBidderName:bidder,
  lastBidderTeam:myTeamName||null,
  lastBidderUid:user.uid
 });
};

// -- Sell (admin only -- winner = last bidder team) --
window.sellPlayer=function(autoSell=false){
 if(!autoSell&&!isAdmin)return window.showAlert('Only the admin can finalize a sale.');
 if(!roomState?.currentBlock?.active)return window.showAlert('No active player on the block.');
 const{currentBid:bid,playerId:rawPid,lastBidderTeam:tn}=roomState.currentBlock;
 if(!tn)return window.showAlert('No bids placed yet -- someone must bid before selling.');
 const pid=String(rawPid);
 const p=roomState.players[pid]||roomState.players[parseInt(pid)];
 const team=roomState.teams[tn];
 if(!p||!team)return window.showAlert(`Team "${tn}" not found. Ensure teams have joined the room.`);
 if(team.budget<bid)return window.showAlert(`Insufficient budget! ${tn} only has \u20b9${team.budget.toFixed(2)} Cr left.`);
 const roster=Array.isArray(team.roster)?[...team.roster]:(team.roster&&typeof team.roster==='object'?Object.values(team.roster):[]);
 if(roster.length>=roomState.setup.maxPlayers)return window.showAlert(`${tn}'s roster is full!`);
 roster.push({name:p.name||p.n,role:p.role||p.r,iplTeam:p.iplTeam||p.t,isOverseas:!!(p.isOverseas||p.o),soldPrice:bid});
 const upd={};
 upd[`/teams/${tn}/roster`]=roster;
 upd[`/teams/${tn}/budget`]=parseFloat((team.budget-bid).toFixed(2));
 upd[`/players/${pid}/status`]='sold';
 upd[`/players/${pid}/soldTo`]=tn;
 upd[`/players/${pid}/soldPrice`]=bid;
 upd['/currentBlock']={active:false,lastAction:`sold_${pid}_${tn}_${bid}`,lastBidderName:null,lastBidderTeam:null,notInterested:null};
 update(ref(db,`auctions/${roomId}`),upd).catch(e=>window.showAlert(e.message));
};

window.markUnsold=function(){
 if(!isAdmin)return;
 if(!roomState?.currentBlock?.active)return;
 const pid=String(roomState.currentBlock.playerId);
 const upd={};
 upd[`/players/${pid}/status`]='unsold';
 upd['/currentBlock']={active:false,lastAction:'unsold',lastBidderName:null,lastBidderTeam:null,notInterested:null};
 update(ref(db,`auctions/${roomId}`),upd);
};


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// POINTS ENGINE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// -- Scoring rules (from your table) --
function calcBattingPoints(runs, balls, fours, sixes, dismissal, isWinningTeam, isMotm){
 if(dismissal==='noresult') return 0;
 let pts = 0;
 pts += runs * 1; // 1pt per run
 pts += Math.floor(runs / 25) * 10; // 10pts every 25 runs
 pts += fours * 1; // 1pt per four (boundary bonus)
 pts += sixes * 2; // 2pts per six
 if(dismissal==='duck') pts -= 5; // -5 duck
 // Strike rate -- eligible if balls faced >= 10 OR runs scored >= 10
 // e.g. 9 off 12 -> eligible (12 balls). 9 off 8 -> not eligible (< 10 balls AND < 10 runs).
 // 12 off 3 -> eligible (12 runs). Virat 9(12) counts. Virat 9(8) doesn't.
 if(balls >= 10 || runs >= 10){
 const sr = (runs / balls) * 100;
 if(sr < 75) pts -= 15;
 else if(sr < 100) pts -= 10;
 else if(sr < 150) pts += 5;
 else if(sr < 200) pts += 10;
 else pts += 15;
 }
 if(isWinningTeam) pts += 5;
 if(isMotm) pts += 25;
 return pts;
}

// Eco auto-calc
document.addEventListener('input',function(e){if(e.target.placeholder==='Eco'&&e.target.value)e.target.dataset.manual='1';if(e.target.placeholder==='Eco'&&!e.target.value)delete e.target.dataset.manual;});
function normalizeOvers(ov){
 // Cricket overs: 3.3 means 3 overs + 3 balls = 3.5 true overs for eco calc
 const full=Math.floor(ov);
 const balls=Math.round((ov-full)*10);
 return full+(balls/6);
}
function calcBowlingPoints(overs, runsConceded, wickets, dots, maidens, isWinningTeam, isMotm){
 if(overs === 0) return isWinningTeam ? 5 : 0;
 let pts = 0;
 pts += wickets * 25; // 25pts per wicket
 if(wickets >= 2) pts += 10; // bonus: first 2 wickets
 if(wickets >2) pts += (wickets - 2) * 10; // bonus: each after 2
 pts += dots * 1; // 1pt per dot
 pts += maidens * 20; // 20pts per maiden
 // Economy (only if bowled >= 1 over)
 const eco = runsConceded / normalizeOvers(overs);
 if(eco <= 5) pts += 15;
 else if(eco <= 8) pts += 10;
 else if(eco <= 10) pts += 5;
 else if(eco <= 12) pts -= 10;
 else pts -= 15;
 if(isWinningTeam) pts += 5;
 if(isMotm) pts += 25;
 return pts;
}

function calcFieldingPoints(catches, stumpings, runouts, isWinningTeam, isMotm){
 let pts = 0;
 pts += catches * 10;
 pts += stumpings * 15;
 pts += runouts * 10;
 if(isWinningTeam) pts += 5;
 if(isMotm) pts += 25;
 return pts;
}

// -- Dynamic form rows --
let battingRowCount=0, bowlingRowCount=0, fieldingRowCount=0;

function playerDatalist(){
 // Prefer roomState players (have full names), fall back to rawData
 let names;
 if(roomState?.players && Object.keys(roomState.players).length>0){
 names=[...new Set(Object.values(roomState.players).map(p=>p.name||p.n||''))].filter(Boolean);
 } else {
 names=[...new Set((rawData||[]).map(p=>p.n||''))].filter(Boolean);
 }
 names.sort();
 return `<datalist id="dlPlayers">${names.map(n=>`<option value="${n}">`).join('')}</datalist>`;
}

window.toggleMatchForm=function(){
 const body=document.getElementById('matchFormBody');
 const btn=event.target;
 const showing=body.style.display!=='none';
 body.style.display=showing?'none':'block';
 btn.textContent=showing?'\u25bc Expand':'\u25b2 Collapse';
 if(!showing&&battingRowCount===0){
 window.addBattingRow();window.addBowlingRow();window.addFieldingRow();
 }
};

window.addBattingRow=function(){
 const id=battingRowCount++;
 const div=document.createElement('div');
 div.id=`br${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr .65fr .65fr .5fr .5fr 1.1fr auto;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`<input list="dlPlayers" placeholder="Player name" id="br${id}name" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="R" id="br${id}runs" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="B" id="br${id}balls" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="4s" id="br${id}fours" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="6s" id="br${id}sixes" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><select id="br${id}dis" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><option value="out">Out</option><option value="notout">Not Out</option><option value="duck">Duck (0)</option></select><button onclick="document.getElementById('br${id}').remove();battingRowCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">x</button>`;
 document.getElementById('battingRows').appendChild(div);
 const dl=document.getElementById('dlPlayers');
 if(!dl) document.getElementById('battingRows').insertAdjacentHTML('beforebegin',playerDatalist());
};;;;

window.addBowlingRow=function(){
 const id=bowlingRowCount++;
 const div=document.createElement('div');
 div.id=`bow${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr .65fr .65fr .5fr .8fr .6fr .6fr auto;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`<input list="dlPlayers" placeholder="Player name" id="bow${id}name" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Ov" id="bow${id}overs" min="0" step="0.1" oninput="window.autoEco('bow${id}')" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="R" id="bow${id}runs" min="0" oninput="window.autoEco('bow${id}')" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="W" id="bow${id}wkts" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Eco" id="bow${id}eco" min="0" step="0.01" title="Auto-fills from Ov+R. Click to override." style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="0s" id="bow${id}dots" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Mdns" id="bow${id}maidens" min="0" style="padding:8px 6px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><button onclick="document.getElementById('bow${id}').remove();bowlingRowCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">x</button>`;
 document.getElementById('bowlingRows').appendChild(div);
};
window.autoEco=function(prefix){
 const ov=parseFloat(document.getElementById(prefix+'overs')?.value)||0;
 const r=parseFloat(document.getElementById(prefix+'runs')?.value)||0;
 const ecoEl=document.getElementById(prefix+'eco');
 if(ecoEl&&!ecoEl.dataset.manual&&ov>0) ecoEl.value=(r/normalizeOvers(ov)).toFixed(2);
 else if(ecoEl&&!ecoEl.dataset.manual&&ov===0) ecoEl.value='';
};

;

window.addFieldingRow=function(){
 const id=fieldingRowCount++;
 const div=document.createElement('div');
 div.id=`fld${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`
 <input list="dlPlayers" placeholder="Player name" id="fld${id}name" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Catches" id="fld${id}catches" min="0" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Stumpings" id="fld${id}stumpings" min="0" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><input type="number" placeholder="Run-outs" id="fld${id}runouts" min="0" style="padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);"><button onclick="document.getElementById('fld${id}').remove();fieldingRowCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">Remove</button>`;
 document.getElementById('fieldingRows').appendChild(div);
};

// -- Collect form data and compute points --
function collectMatchData(){
 const label=document.getElementById('matchLabel').value.trim()||`Match ${Date.now()}`;
 const winner=(document.getElementById('mfWinner').value||'').trim().toUpperCase();
 const motm=(document.getElementById('mfMotm').value||'').trim().toLowerCase();
 const result=document.getElementById('mfResult').value;

 if(result==='noresult') return {label,result,playerPts:{}};

 const playerPts={};
 const winningPlayers=new Set(); // IPL team names that match winner

 function addPts(name,pts,src){
 const key=name.trim().toLowerCase();
 if(!key) return;
 if(!playerPts[key]) playerPts[key]={name:name.trim(),pts:0,breakdown:[]};
 playerPts[key].pts+=pts;
 playerPts[key].breakdown.push(`${src}: ${pts>=0?'+':''}${pts}`);
 }

 // Batting rows
 document.querySelectorAll('[id^="br"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim();
 if(!name) return;
 const runs=parseInt(document.getElementById(`${id}runs`)?.value)||0;
 const balls=parseInt(document.getElementById(`${id}balls`)?.value)||0;
 const fours=parseInt(document.getElementById(`${id}fours`)?.value)||0;
 const sixes=parseInt(document.getElementById(`${id}sixes`)?.value)||0;
 const dis=document.getElementById(`${id}dis`)?.value||'out';
 const isMot=name.toLowerCase()===motm;
 // For winning team: we'll handle after collecting all names
 const pts=calcBattingPoints(runs,balls,fours,sixes,dis,false,isMot);
 addPts(name,pts,`Batting(${runs}r ${balls}b${dis==='duck'?' DUCK':''})`);
 winningPlayers.add(name.toLowerCase());
 });

 // Bowling rows
 document.querySelectorAll('[id^="bow"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim();
 if(!name) return;
 const overs=parseFloat(document.getElementById(`${id}overs`)?.value)||0;
 const runs=parseInt(document.getElementById(`${id}runs`)?.value)||0;
 const wkts=parseInt(document.getElementById(`${id}wkts`)?.value)||0;
 const dots=parseInt(document.getElementById(`${id}dots`)?.value)||0;
 const eco=parseFloat(document.getElementById(`${id}eco`)?.value)||0;
 const maidens=parseInt(document.getElementById(`${id}maidens`)?.value)||0;
 const isMot=name.toLowerCase()===motm;
 const ecoFinal=eco>0?eco:(overs>0?(runs/normalizeOvers(overs)):0);
 const pts=calcBowlingPoints(overs,runs,wkts,dots,maidens,false,isMot);
 addPts(name,pts,`Bowling(${wkts}w ${overs}ov ${runs}r eco:${eco>0?eco.toFixed(2):overs>0?(runs/normalizeOvers(overs)).toFixed(2):'--'})`);
 });

 // Fielding rows
 document.querySelectorAll('[id^="fld"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim();
 if(!name) return;
 const catches=parseInt(document.getElementById(`${id}catches`)?.value)||0;
 const stumpings=parseInt(document.getElementById(`${id}stumpings`)?.value)||0;
 const runouts=parseInt(document.getElementById(`${id}runouts`)?.value)||0;
 if(catches+stumpings+runouts===0) return;
 const isMot=name.toLowerCase()===motm;
 const pts=calcFieldingPoints(catches,stumpings,runouts,false,isMot);
 addPts(name,pts,`Fielding(${catches}c ${stumpings}st ${runouts}ro)`);
 });

 // Apply winning team bonus +5 to players who played
 // We don't know which team each player is on from the form
 // Admin specifies winning IPL team -- we check against roomState players
 if(winner&&roomState?.players){
 Object.values(roomState.players).forEach(p=>{
 const pname=(p.name||p.n||'').trim().toLowerCase();
 const pteam=(p.iplTeam||p.t||'').toUpperCase();
 if(pteam===winner&&playerPts[pname]){
 playerPts[pname].pts+=5;
 playerPts[pname].breakdown.push('Winning team: +5');
 }
 });
 }

 return {label,result,winner,motm,playerPts};
}

window.previewPoints=function(){
 const data=collectMatchData();
 if(data.result==='noresult'){window.showAlert('No Result match -- no points awarded.','info');return;}
 const entries=Object.values(data.playerPts).sort((a,b)=>b.pts-a.pts);
 if(!entries.length){window.showAlert('No player data entered.','err');return;}
 const box=document.getElementById('previewBox');
 const content=document.getElementById('previewContent');
 content.innerHTML=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.85rem;"><thead><tr style="background:rgba(0,0,0,.3);"><th style="padding:8px 12px;text-align:left;color:var(--accent);">Player</th><th style="padding:8px 12px;text-align:right;color:var(--accent);">Points</th><th style="padding:8px 12px;text-align:left;color:var(--accent);">Breakdown</th></tr></thead><tbody>${entries.map(e=>`<tr style="border-bottom:1px solid var(--b1);"><td style="padding:8px 12px;font-weight:600;">${e.name}</td><td style="padding:8px 12px;text-align:right;font-family:var(--f);font-size:1.1rem;color:${e.pts>=0?'var(--ok)':'var(--err)'};">${e.pts>=0?'+':''}${e.pts}</td><td style="padding:8px 12px;font-size:.78rem;color:var(--dim2);">${e.breakdown.join(' . ')}</td></tr>`).join('')}</tbody></table></div>`;
 box.style.display='block';
};

window.submitMatch=function(confirmed=false){
 if(!isAdmin){window.showAlert('Only admin can submit match data.','err');return;}
 if(!roomId||!roomState){window.showAlert('Load a room first.','err');return;}
 const data=collectMatchData();
 if(!confirmed){
 window.previewPoints();
 return;
 }
 // Build Firebase write: auctions/{roomId}/matches/{matchId}
 const matchId=`m${Date.now()}`;
 const matchRecord={
 label:data.label,
 result:data.result,
 winner:data.winner||'',
 motm:data.motm||'',
 timestamp:Date.now(),
 players:{}
 };
 var _ownerMap={};
 if(roomState&&roomState.teams){
  Object.values(roomState.teams).forEach(function(t){
   var roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
   roster.forEach(function(p){ _ownerMap[(p.name||p.n||'').toLowerCase().trim()]=t.name; });
  });
 }
 Object.entries(data.playerPts).forEach(([key,val])=>{
 matchRecord.players[key]={name:val.name,pts:val.pts,breakdown:val.breakdown.join(' | '),ownedBy:_ownerMap[(val.name||'').toLowerCase().trim()]||''};
 });

 set(ref(db,`auctions/${roomId}/matches/${matchId}`),matchRecord)
 .then(()=>{
 window.showAlert(`Match "${data.label}" saved! Points updated for all teams.`,'ok');
 document.getElementById('previewBox').style.display='none';
 document.getElementById('matchFormBody').style.display='none';
 document.getElementById('matchLabel').value='';
 // Reset rows
 document.getElementById('battingRows').innerHTML='';
 document.getElementById('bowlingRows').innerHTML='';
 document.getElementById('fieldingRows').innerHTML='';
 battingRowCount=0;bowlingRowCount=0;fieldingRowCount=0;
 // Update match filter dropdown
 updateMatchFilterOptions();
 })
 .catch(e=>window.showAlert('Save failed: '+e.message));
};

// -- Update match filter dropdown --
function updateMatchFilterOptions(){
 if(!roomState?.matches) return;
 const sel=document.getElementById('matchFilter');
 if(!sel) return;
 const existing=new Set([...sel.options].map(o=>o.value));
 Object.entries(roomState.matches).sort((a,b)=>a[1].timestamp-b[1].timestamp).forEach(([id,m])=>{
 if(!existing.has(id)){
 const opt=document.createElement('option');
 opt.value=id;opt.textContent=m.label||id;
 sel.appendChild(opt);
 }
 });
}

// -- Render Points Tab --
function renderPointsTab(){
 if(!roomState) return;
 updateMatchFilterOptions();
 const matches=roomState.matches||{};
 const matchIds=Object.keys(matches);
 const sel=document.getElementById('matchFilter');
 const filterVal=sel?.value||'all';

 // Build cumulative player pts map
 const playerTotals={}; // name_lower ->{name, pts, matchCount, breakdown[]}
 const matchesToUse=filterVal==='all'?matchIds:[filterVal];
 matchesToUse.forEach(mid=>{
 const m=matches[mid];
 if(!m?.players) return;
 Object.values(m.players).forEach(p=>{
 const key=(p.name||'').toLowerCase();
 if(!key) return;
 if(!playerTotals[key]) playerTotals[key]={name:p.name,pts:0,matchCount:0,matches:[]};
 playerTotals[key].pts+=p.pts||0;
 playerTotals[key].matchCount++;
 playerTotals[key].matches.push({label:m.label||mid,pts:p.pts||0,breakdown:p.breakdown||''});
 });
 });

 // Map to owners from teams
 const ownerMap={}; // playerName_lower ->teamName
 if(roomState.teams){
 Object.values(roomState.teams).forEach(team=>{
 const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
 roster.forEach(p=>{
 const key=(p.name||p.n||'').toLowerCase();
 if(key) ownerMap[key]=team.name;
 });
 });
 }

 // Get player roles from players list
 const roleMap={};
 if(roomState.players){
 Object.values(roomState.players).forEach(p=>{
 roleMap[(p.name||p.n||'').toLowerCase()]=p.role||p.r||'';
 });
 }
 const iplTeamMap={};
 if(roomState.players){
 Object.values(roomState.players).forEach(p=>{
 iplTeamMap[(p.name||p.n||'').toLowerCase()]=p.iplTeam||p.t||'';
 });
 }

 const sorted=Object.values(playerTotals).sort((a,b)=>b.pts-a.pts);
 document.getElementById('rosterCount') // reuse existing if needed
 const tbody=document.getElementById('pointsTbody');
 if(!tbody) return;

 if(!sorted.length){
 tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--dim);">No match data yet. Admin can add scorecards above.</td></tr>';
 return;
 }

 tbody.innerHTML=sorted.map((p,i)=>{
 const key=p.name.toLowerCase();
 const owner=ownerMap[key]||'<span style="color:var(--dim)">Unowned</span>';
 const role=roleMap[key]||'--';
 const iplTeam=iplTeamMap[key]||'--';
 const ptsColor=p.pts>=0?'var(--ok)':'var(--err)';
 const histTitle=p.matches.map(m=>`${m.label}: ${m.pts>=0?'+':''}${m.pts} (${m.breakdown})`).join('\n');
 return `<tr><td style="color:var(--dim)">${i+1}</td><td style="font-weight:600">${p.name}</td><td><span class="badge bg">${iplTeam}</span></td><td style="color:var(--accent-l)">${typeof owner==='string'?owner:owner}</td><td style="color:var(--dim2)">${role}</td><td style="text-align:center">${p.matchCount}</td><td style="font-family:var(--f);font-size:1.1rem;color:${ptsColor};text-align:right">${p.pts>=0?'+':''}${p.pts}</td><td><button class="match-hist-btn" title="${histTitle.replace(/"/g,"'")}">${p.matchCount}</button></td></tr>`;
 }).join('');
}
window.renderPointsTab=renderPointsTab;

// -- Render Leaderboard --
function renderLeaderboard(data){
 if(!data) return;
 const matches=data.matches||{};
 const matchIds=Object.keys(matches);

 // Build total points per team
 const teamPts={}; // teamName ->{pts, players: [{name, pts}]}
 if(data.teams){
 Object.values(data.teams).forEach(team=>{
 teamPts[team.name]={squadValid:team.squadValid!==false,pts:0,topPlayer:'--',topPts:0,playerCount:0};
 });
 }

 // Aggregate all match points per player, then map to teams
 const playerTotal={};
 matchIds.forEach(mid=>{
 const m=matches[mid];
 if(!m?.players) return;
 Object.values(m.players).forEach(p=>{
 const key=(p.name||'').toLowerCase();
 playerTotal[key]=(playerTotal[key]||0)+(p.pts||0);
 });
 });

 // Assign to teams
 if(data.teams){
 Object.values(data.teams).forEach(team=>{
 const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
 roster.forEach(p=>{
 const key=(p.name||p.n||'').toLowerCase();
 const pts=playerTotal[key]||0;
 teamPts[team.name].pts+=pts;
 teamPts[team.name].playerCount++;
 if(pts>teamPts[team.name].topPts){
 teamPts[team.name].topPts=pts;
 teamPts[team.name].topPlayer=p.name||p.n||'--';
 }
 });
 });
 }

 const sorted=Object.entries(teamPts).sort((a,b)=>b[1].pts-a[1].pts);

 // Stats strip
 document.getElementById('lb-matches').textContent=matchIds.length;
 document.getElementById('lb-players-scored').textContent=Object.keys(playerTotal).length;
 const topPts=sorted.length?sorted[0][1].pts:0;
 document.getElementById('lb-top-pts').textContent=topPts;

 const body=document.getElementById('leaderboardBody');
 if(!body) return;
 if(!sorted.length){
 body.innerHTML='<div class="empty">No match data yet.</div>';
 return;
 }

 const medalStyles=[
  'background:linear-gradient(135deg,#FFD700,#FFA500);color:#7A4500;border:1px solid rgba(255,180,0,0.4);',
  'background:linear-gradient(135deg,#C0C0C0,#A0A0A0);color:#404040;border:1px solid rgba(180,180,180,0.4);',
  'background:linear-gradient(135deg,#CD7F32,#A0522D);color:#fff;border:1px solid rgba(180,100,40,0.4);',
];
body.innerHTML=sorted.map(([name,info],i)=>{
 const rankEl=i<3
  ?`<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;flex-shrink:0;${medalStyles[i]}">${i+1}</div>`
  :`<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:600;color:var(--dim);flex-shrink:0;">${i+1}</div>`;
 const medal=rankEl;
 const bar=sorted[0][1].pts>0?Math.round((info.pts/sorted[0][1].pts)*100):0;
 const dq=!info.squadValid;return `<div class="lb-row"${dq?' style="opacity:.45"':''}>${medal}<div style="flex:1;"><div class="lb-team">${name}${dq?` <span style="font-size:.62rem;padding:1px 5px;border-radius:8px;background:var(--err-bg);color:var(--err);border:1px solid var(--err-bdr);font-weight:700;margin-left:5px;">DQ</span>`:``}</div><div class="lb-meta">Top player: ${info.topPlayer} (${info.topPts>=0?'+':''}${info.topPts} pts) . ${info.playerCount} players</div><div style="height:4px;background:var(--b1);border-radius:2px;margin-top:6px;overflow:hidden;"><div style="height:100%;width:${bar}%;background:linear-gradient(90deg,var(--accent),var(--accent-l));border-radius:2px;transition:width .6s;"></div></div></div><div class="lb-pts">${info.pts>=0?'+':''}${info.pts}</div></div>`;
 }).join('');
}

// -- Render Analytics --
function renderAnalytics(data){
 if(!data) return;
 const matches=data.matches||{};
 const playerTotal={};
 Object.values(matches).forEach(m=>{
  if(!m?.players) return;
  Object.values(m.players).forEach(p=>{
   const key=(p.name||'').toLowerCase();
   if(!playerTotal[key]) playerTotal[key]={name:p.name,pts:0,runs:0,balls:0,fours:0,sixes:0,wkts:0,overs:0,bowlRuns:0,ecoStored:0,ecoCount:0,catches:0,stumpings:0,runouts:0,matchCount:0};
   const s=playerTotal[key]; s.pts+=(p.pts||0); s.matchCount++;
   const bd=p.breakdown||'';
   const batM=bd.match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x\u00d7]4)?(?:\s+(\d+)[x\u00d7]6)?/);
   if(batM){s.runs+=+batM[1];s.balls+=+batM[2];s.fours+=+(batM[3]||0);s.sixes+=+(batM[4]||0);}
   const bowM=bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
   if(bowM){s.wkts+=+bowM[1];s.overs+=+bowM[2];s.bowlRuns+=+(bowM[3]||0);
   const ecoM=bd.match(/eco:([\d.]+)/);
   if(ecoM&&+ecoM[1]>0){s.ecoStored+=+ecoM[1];s.ecoCount++;}
  }
   const fldM=bd.match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
   if(fldM){s.catches+=+fldM[1];s.stumpings+=+fldM[2];s.runouts+=+fldM[3];}
  });
 });
 const meta={};
 if(data.players) Object.values(data.players).forEach(p=>{meta[(p.name||p.n||'').toLowerCase()]={role:p.role||p.r||''};});
 const ownerMap={},pricePaid={};
 if(data.teams) Object.values(data.teams).forEach(team=>{
  const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
  roster.forEach(p=>{const k=(p.name||p.n||'').toLowerCase();ownerMap[k]=team.name;pricePaid[k]=p.soldPrice||0;});
 });
 const all=Object.values(playerTotal);
 const byRole=role=>all.filter(p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes(role.toLowerCase()));
 const top=(arr,key,n=5)=>[...arr].filter(p=>p[key]>0).sort((a,b)=>b[key]-a[key]).slice(0,n);
 const topPts=(arr,n=5)=>[...arr].sort((a,b)=>b.pts-a.pts).filter(p=>p.pts>0).slice(0,n);

 // -- Card builder -- clean single-row layout --
 function card(icon,title,subtitle,rows){
  const empty=`<div style="padding:18px 16px;font-size:.78rem;color:var(--dim);text-align:center;letter-spacing:0;">No data yet</div>`;
  const body=rows.length?rows.map((r,i)=>{
   const owner=ownerMap[r.name.toLowerCase()]||'Unowned';
   return`<div style="display:grid;grid-template-columns:18px 1fr auto;align-items:center;padding:9px 14px;border-bottom:1px solid var(--b0);gap:0 10px;">
    <span style="font-size:.68rem;font-weight:500;color:var(--dim);text-align:right;font-variant-numeric:tabular-nums;line-height:1;">${i+1}</span>
    <div style="min-width:0;">
     <div style="font-size:.82rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;">${r.name}</div>
     <div style="font-size:.67rem;color:var(--dim);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${owner} . ${r.matchCount}m${r._sub?' . '+r._sub:''}</div>
    </div>
    <div style="font-size:.84rem;font-weight:600;color:var(--accent);white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;min-width:48px;letter-spacing:-.01em;">${r._stat}</div>
   </div>`;
  }).join(''):empty;
  return`<div style="background:var(--g2);border:1px solid var(--b1);border-radius:var(--rl);overflow:hidden;">
   <div style="padding:10px 14px;border-bottom:1px solid var(--b1);background:var(--g1);display:grid;grid-template-columns:16px 1fr;align-items:start;gap:0 9px;">
    <div style="margin-top:2px;color:var(--dim2);display:flex;align-items:center;">${icon}</div>
    <div>
     <div style="font-size:.73rem;font-weight:600;color:var(--txt);letter-spacing:.01em;">${title}</div>
     ${subtitle?`<div style="font-size:.64rem;color:var(--dim);margin-top:1px;">${subtitle}</div>`:''}
    </div>
   </div>
   ${body}
  </div>`;
 }

 const sec=(label,icon,cards)=>`
  <div style="margin-bottom:22px;">
   <div style="display:grid;grid-template-columns:16px 1fr;align-items:center;gap:0 8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--b1);">
    <div style="color:var(--dim2);display:flex;align-items:center;">${icon}</div>
    <span style="font-size:.68rem;font-weight:600;color:var(--txt2);letter-spacing:.06em;text-transform:uppercase;">${label}</span>
   </div>
   <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;">${cards}</div>
  </div>`;


 const batters=byRole('batter'),bowlers=byRole('bowler'),allrounders=byRole('all'),keepers=byRole('wicketkeeper');

 const pts=arr=>topPts(arr).map(p=>({...p,_stat:`+${p.pts}pts`,_sub:`${p.runs>0?p.runs+'r ':''}`+(p.wkts>0?`${p.wkts}w`:'')}));
 const runs=arr=>top(arr,'runs').map(p=>({...p,_stat:`${p.runs}r`,_sub:`SR ${p.balls>0?((p.runs/p.balls)*100).toFixed(0):'--'}`}));
 const sixes=arr=>top(arr,'sixes').map(p=>({...p,_stat:`${p.sixes}\u00d76`,_sub:`${p.runs}r`}));
 const fours=arr=>top(arr,'fours').map(p=>({...p,_stat:`${p.fours}\u00d74`,_sub:`${p.runs}r`}));
 const wkts=arr=>top(arr,'wkts').map(p=>({...p,_stat:`${p.wkts}w`,_sub:`Eco ${p.ecoCount>0?(p.ecoStored/p.ecoCount).toFixed(2):p.overs>0?(p.bowlRuns/normalizeOvers(p.overs)).toFixed(2):'--'}`}));
 const eco=arr=>[...arr].filter(p=>p.overs>=2||p.ecoCount>0).sort((a,b)=>{const ea=a.ecoCount>0?a.ecoStored/a.ecoCount:a.overs>0?a.bowlRuns/normalizeOvers(a.overs):99;const eb=b.ecoCount>0?b.ecoStored/b.ecoCount:b.overs>0?b.bowlRuns/normalizeOvers(b.overs):99;return ea-eb;}).slice(0,5).map(p=>{const e=p.ecoCount>0?(p.ecoStored/p.ecoCount).toFixed(2):p.overs>0?(p.bowlRuns/normalizeOvers(p.overs)).toFixed(2):'--';return{...p,_stat:`${e}eco`,_sub:`${p.wkts}w.${p.overs}ov`};});
 const dismissals=arr=>top(arr.map(p=>({...p,total:p.catches+p.stumpings+p.runouts})),'total').map(p=>({...p,_stat:`${p.catches+p.stumpings+p.runouts}dis`,_sub:`${p.catches}c ${p.stumpings}st ${p.runouts}ro`}));
 const catches=arr=>top(arr,'catches').map(p=>({...p,_stat:`${p.catches}c`,_sub:`+${p.pts}pts`}));
 const stumpings=arr=>top(arr,'stumpings').map(p=>({...p,_stat:`${p.stumpings}st`,_sub:`${p.catches}c also`}));
 const runouts=arr=>top(arr,'runouts').map(p=>({...p,_stat:`${p.runouts}ro`,_sub:`+${p.pts}pts`}));
 const value=arr=>[...arr].map(p=>({...p,price:pricePaid[p.name.toLowerCase()]||0})).filter(p=>p.price>0&&p.pts>0).sort((a,b)=>(b.pts/b.price)-(a.pts/a.price)).slice(0,5).map(p=>({...p,_stat:`${(p.pts/p.price).toFixed(1)}p/Cr`,_sub:`+${p.pts}pts.\u20b9${p.price.toFixed(1)}Cr`}));

 const grid=document.getElementById('analyticsGrid');
 if(!grid) return;
 grid.innerHTML=
  sec('By Points','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><circle cx="6" cy="18" r="2"/></svg>','Top Batters','fantasy pts',pts(batters))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>','Top Bowlers','fantasy pts',pts(bowlers))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>','All-Rounders','fantasy pts',pts(allrounders))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>','Wicketkeepers','fantasy pts',pts(keepers))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4" rx="1"/><path d="M6 9a6 6 0 0 0 12 0"/></svg>','Overall','all players',pts(all))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 8.5h20M2 15.5h20"/></svg>','Best Value','pts per Crore',value(all))
  )+
  sec('By Batting','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><circle cx="6" cy="18" r="2"/></svg>',
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>','Most Runs','total across matches',runs([...batters,...allrounders,...all].filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i)))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><circle cx="6" cy="18" r="2"/></svg>','Most Sixes','',sixes(all))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><circle cx="6" cy="18" r="2"/></svg>','Most Fours','',fours(all))
  )+
  sec('By Bowling','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>',
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>','Most Wickets','total across matches',wkts([...bowlers,...allrounders,...all].filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i)))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>','Best Economy','min 2 overs',eco([...bowlers,...allrounders,...all].filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i)))
  )+
  sec('By Fielding','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="17"/><line x1="17" y1="11" x2="23" y2="17"/></svg>','Dismissals','catches+stumpings+run-outs',dismissals(all))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>','Catches','',catches(all))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="3" x2="8" y2="21"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><line x1="6" y1="5" x2="18" y2="5"/></svg>','Stumpings','wicketkeepers',stumpings(keepers.length?keepers:all.filter(p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes('wicketkeeper'))))+
   card('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v6l3 3"/><path d="M9 13l-3 3"/><path d="M9 21l3-3 3 3"/></svg>','Run-outs','',runouts(all))
  );
}

// -- CSV Download for Points --
window.downloadPointsCSV=function(){
 if(!roomState?.matches){window.showAlert('No match data yet.','err');return;}
 const matches=roomState.matches;
 const playerTotal={};
 Object.values(matches).forEach(m=>{
 if(!m?.players) return;
 Object.values(m.players).forEach(p=>{
 const key=(p.name||'').toLowerCase();
 if(!playerTotal[key]) playerTotal[key]={name:p.name,pts:0,matchCount:0};
 playerTotal[key].pts+=(p.pts||0);
 playerTotal[key].matchCount++;
 });
 });
 const ownerMap={};
 if(roomState.teams) Object.values(roomState.teams).forEach(team=>{
 const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
 roster.forEach(p=>{ownerMap[(p.name||p.n||'').toLowerCase()]=team.name;});
 });
 const rows=Object.values(playerTotal).sort((a,b)=>b.pts-a.pts)
 .map((p,i)=>[i+1,`"${p.name}"`,ownerMap[p.name.toLowerCase()]||'Unowned',p.matchCount,p.pts]);
 const csv=['#,Player,Owner,Matches,Points',...rows.map(r=>r.join(','))].join('\n');
 const a=document.createElement('a');
 a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
 a.download='fantasy_points.csv';
 a.click();
 window.showAlert('CSV downloaded!','ok');
};

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// GEMINI SCORECARD PARSER -- Firebase AI Logic
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// Stored image files for the current session
let scImageFiles=[];

window.handleScFiles=function(files){
 if(!files||!files.length) return;
 // Merge with existing, cap at 4
 const arr=[...scImageFiles,...Array.from(files)].slice(0,4);
 scImageFiles=arr;
 renderThumbs();
};

function renderThumbs(){
 const row=document.getElementById('scThumbRow');
 if(!row) return;
 row.innerHTML='';
 scImageFiles.forEach((file,i)=>{
 const url=URL.createObjectURL(file);
 const wrap=document.createElement('div');
 wrap.style.cssText='position:relative;display:inline-block;';
 const img=document.createElement('img');
 img.src=url;img.style.cssText='height:72px;width:auto;border-radius:6px;border:1px solid var(--b1);object-fit:cover;display:block;';
 const del=document.createElement('button');
 del.textContent='x';
 del.style.cssText='position:absolute;top:-6px;right:-6px;background:var(--err);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:.65rem;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;';
 del.onclick=()=>{scImageFiles.splice(i,1);renderThumbs();};
 wrap.appendChild(img);wrap.appendChild(del);
 row.appendChild(wrap);
 });
 // Update drop zone hint
 const dz=document.getElementById('scDropZone');
 if(dz){
 const hint=dz.querySelector('div:last-child');
 if(hint) hint.textContent=scImageFiles.length?`${scImageFiles.length} file${scImageFiles.length>1?'s':''} selected -- add more or click Parse`:'PNG . JPG . WEBP . up to 4 files . all innings in one go';
 }
}

const SCORECARD_SYSTEM_PROMPT=`You are a professional cricket scorecard parser.
Extract ALL batting, bowling, and fielding data from ALL innings shown in the images.
Return ONLY a valid JSON object -- no markdown, no explanation, no code fences.

Required JSON structure:
{
 "matchLabel": "Team A vs Team B - Date",
 "winner": "SHORT_CODE e.g. MI, CSK, RCB",
 "motm": "Full Player Name or empty string",
 "result": "normal | noresult | superover",
 "batting": [
 {"name":"Player","runs":0,"balls":0,"fours":0,"sixes":0,"dismissal":"out|notout|duck"}
 ],
 "bowling": [
 {"name":"Player","overs":0.0,"runs":0,"wickets":0,"economy":0.00,"dots":0,"maidens":0}
 ],
 "fielding": [
 {"name":"Player","catches":0,"stumpings":0,"runouts":0}
 ]
}

CRITICAL INSTRUCTIONS FOR ECONOMY (ECON):
1. Look for a column labeled "ECON", "Eco", or "Economy" in the bowling table.
2. Extract the exact value shown (e.g. 8.25, 6.75). This is runs per over.
3. If no economy column is visible, calculate: economy = runs / normalizeOvers(overs), where 3.3 overs = 3.5 actual overs (3 + 3/6).
4. Always include economy for every bowler. Never leave it as 0 if the bowler bowled any overs.

CRITICAL INSTRUCTIONS FOR DOT BALLS (0s):
1. Look for a column labeled "0s", "Dots", or "Dot Balls" in the bowling table.
2. IF NO DOT COLUMN IS VISIBLE: Calculate dots using this formula:
 dots = floor(overs * 6) - runs_conceded
 Minimum dots is 0. NEVER leave dots as 0 if the bowler bowled multiple overs.
3. Example: 4 overs, 32 runs -> dots = 24 - 32 = 0 (floored). 4 overs, 18 runs -> dots = 24 - 18 = 6.

CRITICAL INSTRUCTIONS FOR FOURS (4s):
1. Look for a column labeled "4s" or "Fours" in the batting table.
2. If no fours column is visible, estimate from runs and sixes: fours = max(0, floor((runs - sixes*6) / 4)).
3. Always extract fours for every batter.

RULES:
- Include ALL batters and bowlers from BOTH innings combined.
- Duck = dismissed for 0 runs. notout = not out or retired hurt. Otherwise "out".
- Extract fielders from dismissal text: "c Rohit b Bumrah" -> Rohit +1 catch; "st \u2020Dhoni b Chahal" -> Dhoni +1 stumping; "run out (Jadeja)" -> Jadeja +1 runout.
- Overs as decimal: 3 overs 4 balls = 3.4.
- winner = short IPL team code only (e.g. MI, CSK, RCB).
- Return ONLY the JSON object. Nothing else.`;

window.parseWithGemini=async function(){
 const statusEl=document.getElementById('aiStatus');
 const btn=document.getElementById('geminiParseBtn');
 if(!scImageFiles.length){
 statusEl.className='ai-status fail';
 statusEl.textContent='Upload at least one scorecard screenshot first.';
 return;
 }
 statusEl.className='ai-status parsing';
 statusEl.textContent=' Gemini is reading the scorecard...';
 btn.disabled=true;btn.textContent='Parsing...';

 try{
 // Convert all images to base64 inline data parts
 const imageParts=await Promise.all(scImageFiles.map(file=>new Promise((res,rej)=>{
 const reader=new FileReader();
 reader.onload=e=>res({inlineData:{data:e.target.result.split(',')[1],mimeType:file.type||'image/png'}});
 reader.onerror=rej;
 reader.readAsDataURL(file);
 })));

 // Build content array: all images first, then instruction
 const contentParts=[
 ...imageParts,
 {text:`Parse ${scImageFiles.length>1?'these '+scImageFiles.length+' scorecard screenshots':'this scorecard screenshot'} and return the JSON as instructed.`}
 ];

 const result=await getGeminiModel().generateContent({
 systemInstruction:SCORECARD_SYSTEM_PROMPT,
 contents:[{role:'user',parts:contentParts}]
 });

 const raw=result.response.text();
 const clean=raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
 // Extract JSON object even if there's stray text
 const jsonMatch=clean.match(/\{[\s\S]*\}/);
 if(!jsonMatch) throw new Error('Gemini returned no valid JSON. Try uploading clearer screenshots.');
 const parsed=JSON.parse(jsonMatch[0]);

 populateFormFromAI(parsed);
 statusEl.className='ai-status done';
 statusEl.textContent=`Parsed: ${parsed.batting?.length||0} batters . ${parsed.bowling?.length||0} bowlers . ${parsed.fielding?.length||0} fielders. Review below then save.`;
 // Auto-set match label if empty
 const lbl=document.getElementById('matchLabel');
 if(lbl&&!lbl.value&&parsed.matchLabel) lbl.value=parsed.matchLabel;
 // Open the manual form for review
 const body=document.getElementById('matchFormBody');
 if(body) body.style.display='block';
 }catch(e){
 statusEl.className='ai-status fail';
 statusEl.textContent=`\u274c ${e.message}`;
 }finally{
 btn.disabled=false;btn.textContent=' Parse with Gemini';
 }
};

// Fallback: manual JSON import
window.importFromJson=function(){
 const statusEl=document.getElementById('aiStatus');
 const raw=(document.getElementById('scJsonInput')?.value||'').trim();
 if(!raw){statusEl.className='ai-status fail';statusEl.textContent='Paste JSON first.';return;}
 let parsed;
 try{
 const m=raw.match(/\{[\s\S]*\}/);
 if(!m) throw new Error('No JSON object found');
 parsed=JSON.parse(m[0]);
 }catch(e){statusEl.className='ai-status fail';statusEl.textContent='\u274c Invalid JSON.';return;}
 populateFormFromAI(parsed);
 statusEl.className='ai-status done';
 statusEl.textContent=`Imported: ${parsed.batting?.length||0} batters . ${parsed.bowling?.length||0} bowlers . ${parsed.fielding?.length||0} fielders.`;
};


function populateFormFromAI(parsed){
 // Set match meta fields
 if(parsed.matchLabel) document.getElementById('matchLabel').value=parsed.matchLabel;
 if(parsed.winner) document.getElementById('mfWinner').value=parsed.winner;
 if(parsed.motm) document.getElementById('mfMotm').value=parsed.motm;
 if(parsed.result){
 const sel=document.getElementById('mfResult');
 if(sel){
 [...sel.options].forEach(o=>{if(o.value===parsed.result)o.selected=true;});
 }
 }

 // Clear existing rows
 document.getElementById('battingRows').innerHTML='';
 document.getElementById('bowlingRows').innerHTML='';
 document.getElementById('fieldingRows').innerHTML='';
 battingRowCount=0;bowlingRowCount=0;fieldingRowCount=0;

 // Open form so user can see the populated data
 const body=document.getElementById('matchFormBody');
 if(body) body.style.display='block';

 // Populate batting rows
 (parsed.batting||[]).forEach(batter=>{
 window.addBattingRow();
 const id=battingRowCount-1;
 const setVal=(fld,val)=>{const el=document.getElementById(`br${id}${fld}`);if(el)el.value=val;};
 setVal('name',batter.name||'');
 setVal('runs',batter.runs??'');
 setVal('balls',batter.balls??'');
 setVal('fours',batter.fours??'');
 setVal('sixes',batter.sixes??'');
 // Set dismissal select
 const dis=document.getElementById(`br${id}dis`);
 if(dis){
 const dv=batter.dismissal||'out';
 [...dis.options].forEach(o=>{if(o.value===dv)o.selected=true;});
 }
 });

 // Populate bowling rows
 (parsed.bowling||[]).forEach(bowler=>{
 window.addBowlingRow();
 const id=bowlingRowCount-1;
 const setVal=(fld,val)=>{const el=document.getElementById(`bow${id}${fld}`);if(el)el.value=val;};
 setVal('name',bowler.name||'');
 setVal('overs',bowler.overs??'');
 setVal('runs',bowler.runs??'');
 setVal('wkts',bowler.wickets??'');
 setVal('dots',bowler.dots??'');
 setVal('maidens',bowler.maidens??'');
 // Set eco: use parsed value, or auto-calculate from overs+runs
 // Set eco -- use Gemini's economy field, or calculate from overs+runs
 const _ov=parseFloat(bowler.overs)||0;
 const _r=parseFloat(bowler.runs)||0;
 const _eco=parseFloat(bowler.economy||bowler.econ||bowler.economyRate||0)||(_ov>0?_r/normalizeOvers(_ov):0);
 if(_eco>0){const eEl=document.getElementById(`bow${id}eco`);if(eEl)eEl.value=_eco.toFixed(2);}
 });

 // Populate fielding rows (only if catches/stumpings/runouts >0)
 const fieldingMap={};
 (parsed.fielding||[]).forEach(f=>{
 if((f.catches||0)+(f.stumpings||0)+(f.runouts||0)>0){
 fieldingMap[f.name]=f;
 }
 });
 Object.values(fieldingMap).forEach(f=>{
 window.addFieldingRow();
 const id=fieldingRowCount-1;
 document.getElementById(`fld${id}name`).value=f.name||'';
 document.getElementById(`fld${id}catches`).value=f.catches||'';
 document.getElementById(`fld${id}stumpings`).value=f.stumpings||'';
 document.getElementById(`fld${id}runouts`).value=f.runouts||'';
 });
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// MATCH DATA TAB -- VIEW + EDIT + DELETE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

// Track which match blocks are expanded
const expandedMatches=new Set();

function renderMatchData(data){
 const container=document.getElementById('matchDataList');
 if(!container) return;
 const matches=data?.matches||{};
 const matchIds=Object.keys(matches).sort((a,b)=>(matches[b].timestamp||0)-(matches[a].timestamp||0));
 if(!matchIds.length){container.innerHTML='<div class="empty">No matches recorded yet. Use the Points tab to add match data.</div>';return;}
 container.innerHTML=matchIds.map(mid=>{
  const m=matches[mid];
  const players=m.players?Object.values(m.players):[];
  const resultLabel=m.result==='noresult'?'No Result':m.result==='superover'?'Super Over':'Completed';
  const isOpen=expandedMatches.has(mid);
  const batters=[],bowlers=[],fielders=[];
  players.forEach(p=>{
   const bd=p.breakdown||'';
   const batM=bd.match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x\u00d7]4)?(?:\s+(\d+)[x\u00d7]6)?/);
   if(batM) batters.push({name:p.name,runs:+batM[1],balls:+batM[2],fours:+(batM[3]||0),sixes:+(batM[4]||0),duck:bd.includes('DUCK'),pts:p.pts});
   const bowM=bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
   if(bowM) bowlers.push({name:p.name,wkts:+bowM[1],overs:+bowM[2],runs:+(bowM[3]||0),pts:p.pts});
   const fldM=bd.match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
   if(fldM&&(+fldM[1]||+fldM[2]||+fldM[3])) fielders.push({name:p.name,catches:+fldM[1],stumpings:+fldM[2],runouts:+fldM[3],pts:p.pts});
  });
  batters.sort((a,b)=>b.runs-a.runs);
  bowlers.sort((a,b)=>b.wkts-a.wkts);
  const allPts=[...players].sort((a,b)=>(b.pts||0)-(a.pts||0));
  const sr=p=>p.balls>0?((p.runs/p.balls)*100).toFixed(0):'--';
  const eco=p=>p.overs>0?(p.runs/p.overs).toFixed(2):'--';

  // Styles
  const BASE='font-family:inherit;font-size:.82rem;vertical-align:middle;padding:9px 14px;border-bottom:1px solid var(--b0);';
  const THs='font-size:.67rem;font-weight:700;color:var(--dim2);letter-spacing:.06em;text-transform:uppercase;padding:9px 14px;border-bottom:2px solid var(--b1);background:rgba(108,84,200,0.04);white-space:nowrap;vertical-align:middle;';
  const nameCol='font-weight:600;color:var(--txt);'+BASE;
  const numCol='color:var(--txt2);text-align:right;'+BASE;
  const boldNumCol='font-weight:700;color:var(--txt);text-align:right;'+BASE;
  const ptsCol=pts=>`font-weight:700;text-align:right;white-space:nowrap;${BASE}color:${pts>0?'var(--ok)':pts<0?'var(--err)':'var(--dim)'};`;
  const THl=`style="${THs}text-align:left;"`;
  const THr=`style="${THs}text-align:right;"`;

  const sec=(label,tbl)=>`
   <div style="border-top:2px solid var(--b0);">
    <div style="padding:10px 18px 0;font-size:.65rem;font-weight:700;color:var(--accent);letter-spacing:.09em;text-transform:uppercase;">${label}</div>
    <div style="overflow-x:auto;">${tbl}</div>
   </div>`;

  const battingTable=batters.length?sec('Batting',`
   <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <colgroup>
     <col style="min-width:160px;">
     <col style="width:52px;"><col style="width:52px;">
     <col style="width:44px;"><col style="width:44px;">
     <col style="width:60px;"><col style="width:64px;">
    </colgroup>
    <thead><tr>
     <th ${THl}>Player</th>
     <th ${THr}>R</th><th ${THr}>B</th>
     <th ${THr}>4s</th><th ${THr}>6s</th>
     <th ${THr}>SR</th><th ${THr}>Pts</th>
    </tr></thead>
    <tbody>${batters.map(p=>`<tr style="transition:background .12s;" onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background=''">
     <td style="${nameCol}">${p.name}${p.duck?'&nbsp;<span style="background:var(--err-bg);color:var(--err);border-radius:3px;padding:0 4px;font-size:.60rem;font-weight:700;">DUCK</span>':''}</td>
     <td style="${boldNumCol}">${p.runs}</td>
     <td style="${numCol}">${p.balls}</td>
     <td style="${numCol}">${p.fours}</td>
     <td style="${numCol}">${p.sixes}</td>
     <td style="${numCol}">${sr(p)}</td>
     <td style="${ptsCol(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
    </tr>`).join('')}</tbody>
   </table>`):'';

  const bowlingTable=bowlers.length?sec('Bowling',`
   <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <colgroup>
     <col style="min-width:160px;">
     <col style="width:52px;"><col style="width:52px;">
     <col style="width:44px;"><col style="width:72px;"><col style="width:64px;">
    </colgroup>
    <thead><tr>
     <th ${THl}>Player</th>
     <th ${THr}>Ov</th><th ${THr}>R</th>
     <th ${THr}>W</th><th ${THr}>Eco</th><th ${THr}>Pts</th>
    </tr></thead>
    <tbody>${bowlers.map(p=>`<tr onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background=''">
     <td style="${nameCol}">${p.name}</td>
     <td style="${numCol}">${p.overs}</td>
     <td style="${numCol}">${p.runs}</td>
     <td style="${boldNumCol}">${p.wkts}</td>
     <td style="${numCol}">${eco(p)}</td>
     <td style="${ptsCol(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
    </tr>`).join('')}</tbody>
   </table>`):'';

  const fieldingTable=fielders.length?sec('Fielding',`
   <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <colgroup>
     <col style="min-width:160px;">
     <col style="width:80px;"><col style="width:96px;"><col style="width:84px;"><col style="width:64px;">
    </colgroup>
    <thead><tr>
     <th ${THl}>Player</th>
     <th ${THr}>Catches</th><th ${THr}>Stumpings</th><th ${THr}>Run-outs</th><th ${THr}>Pts</th>
    </tr></thead>
    <tbody>${fielders.map(p=>`<tr onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background=''">
     <td style="${nameCol}">${p.name}</td>
     <td style="${numCol}">${p.catches}</td>
     <td style="${numCol}">${p.stumpings}</td>
     <td style="${numCol}">${p.runouts}</td>
     <td style="${ptsCol(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
    </tr>`).join('')}</tbody>
   </table>`):'';

  const ptsTable=sec('Points Summary',`
   <table style="width:100%;border-collapse:collapse;">
    <thead><tr>
     <th ${THl} style="${THs}text-align:left;width:180px;">Player</th>
     <th ${THl}>Breakdown</th>
     <th ${THr} style="${THs}text-align:right;width:72px;">Pts</th>
    </tr></thead>
    <tbody>${allPts.map(p=>`<tr onmouseover="this.style.background='rgba(255,255,255,0.4)'" onmouseout="this.style.background=''">
     <td style="${nameCol}width:180px;white-space:nowrap;">${p.name}</td>
     <td style="${BASE}color:var(--dim2);font-size:.76rem;">${(p.breakdown||'').replace(/ \| /g,' . ')}</td>
     <td style="${ptsCol(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
    </tr>`).join('')}</tbody>
   </table>`);

  const deleteBtn=isAdmin?`<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();window.deleteMatch('${mid}','${(m.label||mid).replace(/'/g,"\\'")}')">Delete</button>`:'';
  const metaEditor=isAdmin?`<div style="padding:10px 16px;border-bottom:1px solid var(--b0);display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:rgba(108,84,200,0.03);">
   <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:.62rem;color:var(--dim2);text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Label</span><input class="edit-input" style="min-width:150px;" value="${m.label||''}" onblur="window.saveMatchMeta('${mid}','label',this.value)"></div>
   <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:.62rem;color:var(--dim2);text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Winner</span><input class="edit-input" style="min-width:50px;" value="${m.winner||''}" onblur="window.saveMatchMeta('${mid}','winner',this.value.toUpperCase())"></div>
   <div style="display:flex;align-items:center;gap:5px;"><span style="font-size:.62rem;color:var(--dim2);text-transform:uppercase;letter-spacing:.06em;font-weight:600;">MOTM</span><input class="edit-input" style="min-width:120px;" value="${m.motm||''}" onblur="window.saveMatchMeta('${mid}','motm',this.value)"></div>
  </div>`:'';

  return`<div class="match-block" id="mb_${mid}">
   <div class="match-block-hdr" onclick="window.toggleMatchBlock('${mid}')">
    <div style="flex:1;min-width:0;">
     <div class="match-label">${m.label||mid}</div>
     <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;">
      ${m.winner?`<span style="background:var(--ok-bg);border:1px solid var(--ok-bdr);color:var(--ok);border-radius:20px;padding:2px 9px;font-size:.68rem;font-weight:600;">${m.winner} won</span>`:''}
      ${m.motm?`<span style="background:var(--accent-bg);border:1px solid var(--accent-bdr);color:var(--accent);border-radius:20px;padding:2px 9px;font-size:.68rem;font-weight:600;">MOTM: ${m.motm}</span>`:''}
      <span style="background:var(--g1);border:1px solid var(--b1);border-radius:20px;padding:2px 9px;font-size:.68rem;color:var(--dim2);">${resultLabel}</span>
      <span style="font-size:.68rem;color:var(--dim);">${batters.length} batters . ${bowlers.length} bowlers${fielders.length?' . '+fielders.length+' fielders':''}</span>
     </div>
    </div>
    <div style="display:flex;gap:7px;align-items:center;flex-shrink:0;">
     ${deleteBtn}
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="color:var(--dim);transition:transform .2s;${isOpen?'transform:rotate(180deg)':''}"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
   </div>
   <div class="match-body${isOpen?' open':''}" id="mbd_${mid}">
    ${metaEditor}${battingTable}${bowlingTable}${fieldingTable}${ptsTable}
   </div>
  </div>`;
 }).join('');
}

// -- Toggle match block open/close --
window.toggleMatchBlock=function(mid){
 if(expandedMatches.has(mid)) expandedMatches.delete(mid);
 else expandedMatches.add(mid);
 // Re-render just this block's body without full re-render
 const body=document.getElementById(`mbd_${mid}`);
 if(body) body.classList.toggle('open', expandedMatches.has(mid));
 // Update chevron
 const hdr=document.querySelector(`#mb_${mid} .match-block-hdr span:last-child`);
 if(hdr) hdr.textContent=expandedMatches.has(mid)?'\u25b2':'\u25bc';
};

// -- Save match meta field (label, winner, motm, result) --
window.saveMatchMeta=function(mid,field,value){
 if(!isAdmin||!roomId) return;
 const trimmed=value.trim();
 update(ref(db,`auctions/${roomId}/matches/${mid}`),{[field]:trimmed})
 .then(()=>window.showAlert(`${field} updated.`,'ok'))
 .catch(e=>window.showAlert(e.message));
};

// -- Save individual player stat in a match --
window.savePlayerStat=function(mid,pkey,field,value){
 if(!isAdmin||!roomId) return;
 update(ref(db,`auctions/${roomId}/matches/${mid}/players/${pkey}`),{[field]:value})
 .then(()=>window.showAlert(`Saved.`,'ok'))
 .catch(e=>window.showAlert(e.message));
};

// -- Remove a player from a match --
window.removePlayerFromMatch=function(mid,pkey){
 if(!isAdmin||!roomId) return;
 if(!confirm('Remove this player from the match?')) return;
 remove(ref(db,`auctions/${roomId}/matches/${mid}/players/${pkey}`))
 .then(()=>window.showAlert('Player removed.','ok'))
 .catch(e=>window.showAlert(e.message));
};

// -- Add blank player row to a match --
window.addPlayerToMatch=function(mid){
 if(!isAdmin||!roomId) return;
 const name=prompt('Player name:');
 if(!name||!name.trim()) return;
 const pkey=name.trim().toLowerCase().replace(/[^a-z0-9]/g,'_')+'_'+Date.now();
 set(ref(db,`auctions/${roomId}/matches/${mid}/players/${pkey}`),{
 name:name.trim(),pts:0,breakdown:'Manually added'
 }).then(()=>window.showAlert(`${name} added.`,'ok'))
 .catch(e=>window.showAlert(e.message));
};

// -- Delete entire match --
window.deleteMatch=function(mid,label){
 if(!isAdmin||!roomId) return;
 if(!confirm(`Permanently delete match "${label}"? This removes all points for this match.`)) return;
 remove(ref(db,`auctions/${roomId}/matches/${mid}`))
 .then(()=>{
 expandedMatches.delete(mid);
 window.showAlert(`Match "${label}" deleted.`,'ok');
 })
 .catch(e=>window.showAlert(e.message));
};

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// GLOBAL SCORECARD TAB -- pushes to ALL owned rooms
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

let gscImageFiles=[];
let gscBattingCount=0, gscBowlingCount=0, gscFieldingCount=0;

// -- File handling (same pattern as in-room parser) --
window.handleGscFiles=function(files){
 if(!files||!files.length) return;
 gscImageFiles=[...gscImageFiles,...Array.from(files)].slice(0,4);
 renderGscThumbs();
};

function renderGscThumbs(){
 const row=document.getElementById('gscThumbRow');
 if(!row) return;
 row.innerHTML='';
 gscImageFiles.forEach((file,i)=>{
 const url=URL.createObjectURL(file);
 const wrap=document.createElement('div');
 wrap.style.cssText='position:relative;display:inline-block;';
 const img=document.createElement('img');
 img.src=url;
 img.style.cssText='height:72px;width:auto;border-radius:6px;border:1px solid var(--b1);object-fit:cover;display:block;';
 const del=document.createElement('button');
 del.textContent='x';
 del.style.cssText='position:absolute;top:-6px;right:-6px;background:var(--err);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:.65rem;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;';
 del.onclick=()=>{gscImageFiles.splice(i,1);renderGscThumbs();};
 wrap.appendChild(img);wrap.appendChild(del);
 row.appendChild(wrap);
 });
 const hint=document.getElementById('gscDropHint');
 if(hint) hint.textContent=gscImageFiles.length?`${gscImageFiles.length} file${gscImageFiles.length>1?'s':''} loaded`:'PNG . JPG . WEBP . up to 4 files';
}

// -- Gemini parse for global scorecard --
window.parseGlobalScorecard=async function(){
 const statusEl=document.getElementById('gscParseStatus');
 const btn=document.getElementById('gscParseBtn');
 if(!gscImageFiles.length){
 statusEl.className='ai-status fail';
 statusEl.textContent='Upload at least one screenshot first.';
 return;
 }
 statusEl.className='ai-status parsing';
 statusEl.textContent=' Gemini is reading the scorecard...';
 btn.disabled=true; btn.textContent='Parsing...';
 try{
 const imageParts=await Promise.all(gscImageFiles.map(file=>new Promise((res,rej)=>{
 const reader=new FileReader();
 reader.onload=e=>res({inlineData:{data:e.target.result.split(',')[1],mimeType:file.type||'image/png'}});
 reader.onerror=rej;
 reader.readAsDataURL(file);
 })));
 const result=await getGeminiModel().generateContent({
 systemInstruction:SCORECARD_SYSTEM_PROMPT,
 contents:[{role:'user',parts:[...imageParts,{text:`Parse ${gscImageFiles.length>1?'these '+gscImageFiles.length+' scorecard screenshots':'this scorecard screenshot'} and return the JSON.`}]}]
 });
 const raw=result.response.text();
 const clean=raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
 const m=clean.match(/\{[\s\S]*\}/);
 if(!m) throw new Error('No valid JSON returned. Try clearer screenshots.');
 const parsed=JSON.parse(m[0]);
 populateGscForm(parsed);
 statusEl.className='ai-status done';
 statusEl.textContent=`Parsed: ${parsed.batting?.length||0} batters . ${parsed.bowling?.length||0} bowlers . ${parsed.fielding?.length||0} fielders. Review and save.`;
 }catch(e){
 statusEl.className='ai-status fail';
 statusEl.textContent=`\u274c ${e.message}`;
 }finally{
 btn.disabled=false; btn.textContent=' Parse with Gemini';
 }
};

// -- Row builders for global scorecard form --
function gscInputStyle(){ return 'padding:8px 10px;font-size:.83rem;background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);'; }

window.addGscBattingRow=function(){
 const id=gscBattingCount++;
 const div=document.createElement('div');
 div.id=`gscbr${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscbr${id}name" style="${gscInputStyle()}"><input type="number" placeholder="R" id="gscbr${id}runs" min="0" style="${gscInputStyle()}"><input type="number" placeholder="B" id="gscbr${id}balls" min="0" style="${gscInputStyle()}"><input type="number" placeholder="4s" id="gscbr${id}fours" min="0" style="${gscInputStyle()}"><input type="number" placeholder="6s" id="gscbr${id}sixes" min="0" style="${gscInputStyle()}"><select id="gscbr${id}dis" style="${gscInputStyle()}"><option value="out">Out</option><option value="notout">Not Out</option><option value="duck">Duck</option></select><button onclick="document.getElementById('gscbr${id}').remove();gscBattingCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">Remove</button>`;
 document.getElementById('gscBattingRows').appendChild(div);
 if(!document.getElementById('gscDlPlayers')){
 const dl=document.createElement('datalist'); dl.id='gscDlPlayers';
 // Populate from the 250-player rawData array (always available)
 const playerNames=[...new Set((rawData||[]).map(p=>p.n||'').filter(Boolean))];
 playerNames.forEach(n=>{ const o=document.createElement('option'); o.value=n; dl.appendChild(o); });
 document.getElementById('gscBattingRows').insertAdjacentElement('beforebegin',dl);
 }
};

window.addGscBowlingRow=function(){
 const id=gscBowlingCount++;
 const div=document.createElement('div');
 div.id=`gscbow${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscbow${id}name" style="${gscInputStyle()}"><input type="number" placeholder="Ov" id="gscbow${id}overs" min="0" step="0.1" style="${gscInputStyle()}"><input type="number" placeholder="R" id="gscbow${id}runs" min="0" style="${gscInputStyle()}"><input type="number" placeholder="Eco" id="gscbow${id}eco" min="0" step="0.01" style="${gscInputStyle()}"><input type="number" placeholder="W" id="gscbow${id}wkts" min="0" style="${gscInputStyle()}"><input type="number" placeholder="0s" id="gscbow${id}dots" min="0" style="${gscInputStyle()}"><input type="number" placeholder="Mdns" id="gscbow${id}maidens" min="0" style="${gscInputStyle()}"><button onclick="document.getElementById('gscbow${id}').remove();gscBowlingCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">Remove</button>`;
 document.getElementById('gscBowlingRows').appendChild(div);
};

window.addGscFieldingRow=function(){
 const id=gscFieldingCount++;
 const div=document.createElement('div');
 div.id=`gscfld${id}`;
 div.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.5fr;gap:8px;padding:8px 20px;border-bottom:1px solid var(--b1);align-items:center;';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscfld${id}name" style="${gscInputStyle()}"><input type="number" placeholder="Catches" id="gscfld${id}catches" min="0" style="${gscInputStyle()}"><input type="number" placeholder="Stumpings" id="gscfld${id}stumpings" min="0" style="${gscInputStyle()}"><input type="number" placeholder="Run-outs" id="gscfld${id}runouts" min="0" style="${gscInputStyle()}"><button onclick="document.getElementById('gscfld${id}').remove();gscFieldingCount--;" style="background:var(--err-bg);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:var(--r);padding:6px 10px;cursor:pointer;font-size:.78rem;font-family:var(--f);">Remove</button>`;
 document.getElementById('gscFieldingRows').appendChild(div);
};

// -- Populate form from Gemini output --
function populateGscForm(parsed){
 if(parsed.matchLabel) document.getElementById('gscMatchLabel').value=parsed.matchLabel;
 if(parsed.winner) document.getElementById('gscWinner').value=parsed.winner;
 if(parsed.motm) document.getElementById('gscMotm').value=parsed.motm;
 if(parsed.result){
 const sel=document.getElementById('gscResult');
 if(sel)[...sel.options].forEach(o=>{if(o.value===parsed.result)o.selected=true;});
 }
 document.getElementById('gscBattingRows').innerHTML='';
 document.getElementById('gscBowlingRows').innerHTML='';
 document.getElementById('gscFieldingRows').innerHTML='';
 gscBattingCount=0; gscBowlingCount=0; gscFieldingCount=0;
 document.getElementById('gscFormBody').style.display='block';

 (parsed.batting||[]).forEach(b=>{
 window.addGscBattingRow();
 const id=gscBattingCount-1;
 const sv=(f,v)=>{const el=document.getElementById(`gscbr${id}${f}`);if(el)el.value=v;};
 sv('name',b.name||''); sv('runs',b.runs??''); sv('balls',b.balls??'');
 sv('fours',b.fours??''); sv('sixes',b.sixes??'');
 const dis=document.getElementById(`gscbr${id}dis`);
 if(dis)[...dis.options].forEach(o=>{if(o.value===(b.dismissal||'out'))o.selected=true;});
 });
 (parsed.bowling||[]).forEach(b=>{
 window.addGscBowlingRow();
 const id=gscBowlingCount-1;
 const sv=(f,v)=>{const el=document.getElementById(`gscbow${id}${f}`);if(el)el.value=v;};
 sv('name',b.name||''); sv('overs',b.overs??''); sv('runs',b.runs??'');
 sv('wkts',b.wickets??''); sv('dots',b.dots??''); sv('maidens',b.maidens??'');
 const _gov=parseFloat(b.overs)||0;
 const _gr=parseFloat(b.runs)||0;
 const _geco=parseFloat(b.economy||b.econ||b.economyRate||0)||(_gov>0?_gr/normalizeOvers(_gov):0);
 if(_geco>0){const gEl=document.getElementById(`gscbow${id}eco`);if(gEl)gEl.value=_geco.toFixed(2);}
 });
 const fm={};
 (parsed.fielding||[]).forEach(f=>{if((f.catches||0)+(f.stumpings||0)+(f.runouts||0)>0)fm[f.name]=f;});
 Object.values(fm).forEach(f=>{
 window.addGscFieldingRow();
 const id=gscFieldingCount-1;
 const sv=(f2,v)=>{const el=document.getElementById(`gscfld${id}${f2}`);if(el)el.value=v;};
 sv('name',f.name||''); sv('catches',f.catches||'');
 sv('stumpings',f.stumpings||''); sv('runouts',f.runouts||'');
 });
}

// -- Collect global form data --
function collectGscData(){
 const label=document.getElementById('gscMatchLabel').value.trim()||`Match ${Date.now()}`;
 const winner=(document.getElementById('gscWinner').value||'').trim().toUpperCase();
 const motm=(document.getElementById('gscMotm').value||'').trim().toLowerCase();
 const result=document.getElementById('gscResult').value;
 if(result==='noresult') return {label,result,playerPts:{}};
 const playerPts={};
 function addP(name,pts,src){
 const key=name.trim().toLowerCase();
 if(!key) return;
 if(!playerPts[key]) playerPts[key]={name:name.trim(),pts:0,breakdown:[]};
 playerPts[key].pts+=pts;
 playerPts[key].breakdown.push(`${src}: ${pts>=0?'+':''}${pts}`);
 }
 // Batting
 document.querySelectorAll('[id^="gscbr"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim(); if(!name) return;
 const runs=parseInt(document.getElementById(`${id}runs`)?.value)||0;
 const balls=parseInt(document.getElementById(`${id}balls`)?.value)||0;
 const fours=parseInt(document.getElementById(`${id}fours`)?.value)||0;
 const sixes=parseInt(document.getElementById(`${id}sixes`)?.value)||0;
 const dis=document.getElementById(`${id}dis`)?.value||'out';
 const isMot=name.toLowerCase()===motm;
 const pts=calcBattingPoints(runs,balls,fours,sixes,dis,false,isMot);
 addP(name,pts,`Bat(${runs}r ${balls}b ${fours}\u00d74 ${sixes}\u00d76${dis==='duck'?' DUCK':''})`);
 });
 // Bowling
 document.querySelectorAll('[id^="gscbow"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim(); if(!name) return;
 const overs=parseFloat(document.getElementById(`${id}overs`)?.value)||0;
 const runs=parseInt(document.getElementById(`${id}runs`)?.value)||0;
 const wkts=parseInt(document.getElementById(`${id}wkts`)?.value)||0;
 const dots=parseInt(document.getElementById(`${id}dots`)?.value)||0;
 const eco=parseFloat(document.getElementById(`${id}eco`)?.value)||0;
 const maidens=parseInt(document.getElementById(`${id}maidens`)?.value)||0;
 const isMot=name.toLowerCase()===motm;
 const ecoFinal=eco>0?eco:(overs>0?(runs/normalizeOvers(overs)):0);
 const pts=calcBowlingPoints(overs,runs,wkts,dots,maidens,false,isMot);
 addP(name,pts,`Bowl(${wkts}w ${overs}ov eco:${ecoFinal>0?ecoFinal.toFixed(2):'--'})`);
 });
 // Fielding
 document.querySelectorAll('[id^="gscfld"][id$="name"]').forEach(inp=>{
 const id=inp.id.replace('name','');
 const name=inp.value.trim(); if(!name) return;
 const catches=parseInt(document.getElementById(`${id}catches`)?.value)||0;
 const stumpings=parseInt(document.getElementById(`${id}stumpings`)?.value)||0;
 const runouts=parseInt(document.getElementById(`${id}runouts`)?.value)||0;
 if(catches+stumpings+runouts===0) return;
 const isMot=name.toLowerCase()===motm;
 const pts=calcFieldingPoints(catches,stumpings,runouts,false,isMot);
 addP(name,pts,`Field(${catches}c ${stumpings}st ${runouts}ro)`);
 });
 // Winning team bonus
 if(winner){
 // Apply +5 to players in the scorecard whose IPL team matches winner
 // We don't have team info in the global form so just mark winner for later
 // Each room's scoring engine handles the +5 from the winner field
 }
 return {label,result,winner,motm,playerPts};
}

// -- Preview global points --
window.previewGlobalPoints=function(){
 const data=collectGscData();
 if(data.result==='noresult'){window.showAlert('No Result -- no points awarded.','info');return;}
 const entries=Object.values(data.playerPts).sort((a,b)=>b.pts-a.pts);
 if(!entries.length){window.showAlert('No player data entered.','err');return;}
 const box=document.getElementById('gscPreviewBox');
 const content=document.getElementById('gscPreviewContent');
 content.innerHTML=`<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.85rem;"><thead><tr style="background:rgba(0,0,0,.3);"><th style="padding:8px 12px;text-align:left;color:var(--accent);">Player</th><th style="padding:8px 12px;text-align:right;color:var(--accent);">Points</th><th style="padding:8px 12px;text-align:left;color:var(--accent);">Breakdown</th></tr></thead><tbody>${entries.map(e=>`<tr style="border-bottom:1px solid var(--b1);"><td style="padding:8px 12px;font-weight:600;">${e.name}</td><td style="padding:8px 12px;text-align:right;font-family:var(--f);font-size:1.1rem;color:${e.pts>=0?'var(--ok)':'var(--err)'};">${e.pts>=0?'+':''}${e.pts}</td><td style="padding:8px 12px;font-size:.78rem;color:var(--dim2);">${e.breakdown.join(' . ')}</td></tr>`).join('')}</tbody></table></div>`;
 box.style.display='block';
};

// -- Save & fan-out to all owned rooms --
window.saveGlobalScorecard=async function(){
 if(!user) return;
 const statusEl=document.getElementById('gscSaveStatus');
 const data=collectGscData();
 if(!data.label){statusEl.className='ai-status fail';statusEl.textContent='Enter a match label first.';return;}

 statusEl.className='ai-status parsing';
 statusEl.textContent=' Saving and pushing to all your rooms...';

 // Build match record
 const matchId=`m${Date.now()}`;
 const matchRecord={
 label:data.label,
 result:data.result,
 winner:data.winner||'',
 motm:data.motm||'',
 timestamp:Date.now(),
 players:{}
 };
 Object.entries(data.playerPts).forEach(([key,val])=>{
 matchRecord.players[key]={name:val.name,pts:val.pts,breakdown:val.breakdown.join(' | ')};
 });

 try{
 // 1. Save to user's global scorecard store (source of truth)
 await set(ref(db,`users/${user.uid}/scorecards/${matchId}`),matchRecord);

 // 2. Fan-out: get all owned auction rooms
 const [aSnap,dSnap]=await Promise.all([
 get(ref(db,`users/${user.uid}/auctions`)),
 get(ref(db,`users/${user.uid}/drafts`))
 ]);

 const fanOutWrites={};
 const aRooms=aSnap.val()||{};
 const dRooms=dSnap.val()||{};

 Object.keys(aRooms).forEach(rid=>{
 fanOutWrites[`auctions/${rid}/matches/${matchId}`]=matchRecord;
 });
 Object.keys(dRooms).forEach(rid=>{
 fanOutWrites[`drafts/${rid}/matches/${matchId}`]=matchRecord;
 });

 const totalRooms=Object.keys(aRooms).length+Object.keys(dRooms).length;

 if(totalRooms>0){
 await update(ref(db),fanOutWrites);
 }

 statusEl.className='ai-status done';
 statusEl.textContent=`"${data.label}" saved and pushed to ${totalRooms} room${totalRooms===1?'':'s'} (${Object.keys(aRooms).length} auction . ${Object.keys(dRooms).length} draft).`;

 // Reset form
 document.getElementById('gscBattingRows').innerHTML='';
 document.getElementById('gscBowlingRows').innerHTML='';
 document.getElementById('gscFieldingRows').innerHTML='';
 document.getElementById('gscMatchLabel').value='';
 document.getElementById('gscWinner').value='';
 document.getElementById('gscMotm').value='';
 document.getElementById('gscPreviewBox').style.display='none';
 gscBattingCount=0; gscBowlingCount=0; gscFieldingCount=0;
 gscImageFiles=[];
 renderGscThumbs();
 document.getElementById('gscFormBody').style.display='none';
 renderGlobalScorecardHistory();

 }catch(e){
 statusEl.className='ai-status fail';
 statusEl.textContent=`\u274c Save failed: ${e.message}`;
 }
};

// -- Render global scorecard history --
function renderGlobalScorecardHistory(){
 if(!user) return;
 const list=document.getElementById('gscHistoryList');
 if(!list) return;
 get(ref(db,`users/${user.uid}/scorecards`)).then(snap=>{
 const data=snap.val();
 if(!data){list.innerHTML='<div class="empty" style="padding:20px;">No matches saved yet.</div>';return;}
 const entries=Object.entries(data).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
 list.innerHTML=entries.map(([mid,m])=>{
 const playerCount=m.players?Object.keys(m.players).length:0;
 const topPlayer=m.players?Object.values(m.players).sort((a,b)=>(b.pts||0)-(a.pts||0))[0]:null;
 const resultLabel=m.result==='noresult'?'No Result':m.result==='superover'?'Super Over':'Completed';
 return`<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--b1);gap:12px;flex-wrap:wrap;"><div><div style="font-family:var(--f);font-size:17px;color:var(--accent);">${m.label||mid}</div><div style="font-size:.78rem;color:var(--dim);margin-top:2px;">${m.winner?`Winner: <strong>${m.winner}</strong>. `:''}
 ${m.motm?`MOTM: ${m.motm} . `:''}
 ${resultLabel} . ${playerCount} players scored
 ${topPlayer?` . Top: <strong>${topPlayer.name}</strong>(${topPlayer.pts>=0?'+':''}${topPlayer.pts} pts)`:''}
 </div></div><div style="display:flex;gap:8px;align-items:center;flex-shrink:0;"><button class="btn btn-ghost btn-sm" onclick="window.repushScorecard('${mid}')">Re-push</button><button class="btn btn-danger btn-sm" onclick="window.deleteGlobalScorecard('${mid}','${(m.label||mid).replace(/'/g,"\\'")}')"></button></div></div>`;
 }).join('');
 }).catch(e=>{ list.innerHTML=`<div class="empty" style="padding:20px;">Error loading: ${e.message}</div>`; });
}

// -- Re-push a previously saved scorecard to all rooms --
window.repushScorecard=async function(mid){
 if(!user) return;
 try{
 const snap=await get(ref(db,`users/${user.uid}/scorecards/${mid}`));
 if(!snap.exists()){window.showAlert('Scorecard not found.','err');return;}
 const matchRecord=snap.val();
 const [aSnap,dSnap]=await Promise.all([
 get(ref(db,`users/${user.uid}/auctions`)),
 get(ref(db,`users/${user.uid}/drafts`))
 ]);
 const fanOut={};
 Object.keys(aSnap.val()||{}).forEach(rid=>{fanOut[`auctions/${rid}/matches/${mid}`]=matchRecord;});
 Object.keys(dSnap.val()||{}).forEach(rid=>{fanOut[`drafts/${rid}/matches/${mid}`]=matchRecord;});
 await update(ref(db),fanOut);
 const total=Object.keys(aSnap.val()||{}).length+Object.keys(dSnap.val()||{}).length;
 window.showAlert(`Re-pushed "${matchRecord.label}" to ${total} room${total===1?'':'s'}.`,'ok');
 }catch(e){ window.showAlert('Re-push failed: '+e.message); }
};

// -- Delete a global scorecard --
window.deleteGlobalScorecard=async function(mid,label){
 if(!user) return;
 if(!confirm(`Delete "${label}"?\n\nThis removes it from your Scorecards list.`)) return;

 // Ask if they also want to wipe it from all rooms
 const fromRooms=confirm(`Also remove "${label}" points from ALL your rooms?\n\nOK = remove from all rooms too\nCancel = keep points in rooms (global list only)`);

 try{
 const writes=[];

 // Always remove from global scorecard store
 writes.push(remove(ref(db,`users/${user.uid}/scorecards/${mid}`)));

 if(fromRooms){
 // Fan-out: remove from every owned auction + draft room
 const [aSnap,dSnap]=await Promise.all([
 get(ref(db,`users/${user.uid}/auctions`)),
 get(ref(db,`users/${user.uid}/drafts`))
 ]);
 const fanOut={};
 Object.keys(aSnap.val()||{}).forEach(rid=>{ fanOut[`auctions/${rid}/matches/${mid}`]=null; });
 Object.keys(dSnap.val()||{}).forEach(rid=>{ fanOut[`drafts/${rid}/matches/${mid}`]=null; });
 if(Object.keys(fanOut).length>0) writes.push(update(ref(db),fanOut));
 }

 await Promise.all(writes);
 const msg=fromRooms
 ?`"${label}" deleted from scorecards and all rooms.`
 :`"${label}" deleted from scorecards. Room points unchanged.`;
 window.showAlert(msg,'ok');
 renderGlobalScorecardHistory();
 }catch(e){ window.showAlert('Delete failed: '+e.message); }
};

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// SUPER ADMIN PANEL
// Only accessible to namanmehra@gmail.com
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

function isSuperAdmin(){ return isSuperAdminEmail(user?.email); }

async function renderSuperAdminPanel(){
 if(!isSuperAdmin()) return;

 const statusEl=document.getElementById('saPushStatus');
 const roomsList=document.getElementById('saRoomsList');
 if(roomsList) roomsList.innerHTML='<div class="empty" style="padding:20px;">Loading all rooms...</div>';

 try{
 // Scan all users to collect every room
 const usersSnap=await get(ref(db,'users'));
 const usersData=usersSnap.val()||{};

 let totalUsers=0, allAuctions={}, allDrafts={}, totalMatches=0;

 Object.entries(usersData).forEach(([uid,udata])=>{
 totalUsers++;
 if(udata.auctions) Object.entries(udata.auctions).forEach(([rid,r])=>{ allAuctions[rid]={...r,_ownerUid:uid,_ownerEmail:r.email||uid}; });
 if(udata.drafts) Object.entries(udata.drafts).forEach(([rid,r])=>{ allDrafts[rid]={...r,_ownerUid:uid,_ownerEmail:r.email||uid}; });
 });

 // Get global scorecards for push selector
 const scSnap=await get(ref(db,`users/${user.uid}/scorecards`));
 const scorecards=scSnap.val()||{};
 totalMatches=Object.keys(scorecards).length;

 // Count matches across all rooms (sample first 5 auction rooms)
 // Update stats
 document.getElementById('sa-total-users').textContent=totalUsers;
 document.getElementById('sa-total-auctions').textContent=Object.keys(allAuctions).length;
 document.getElementById('sa-total-drafts').textContent=Object.keys(allDrafts).length;
 document.getElementById('sa-total-matches').textContent=totalMatches;

 // Populate scorecard select
 const sel=document.getElementById('saScorecardSelect');
 if(sel){
 sel.innerHTML='<option value="">-- Select a saved scorecard --</option>';
 Object.entries(scorecards).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0)).forEach(([mid,m])=>{
 const opt=document.createElement('option');
 opt.value=mid; opt.textContent=m.label||mid;
 sel.appendChild(opt);
 });
 }

 // Render rooms list
 if(!roomsList) return;
 const aEntries=Object.entries(allAuctions).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 const dEntries=Object.entries(allDrafts).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));

 if(!aEntries.length&&!dEntries.length){
 roomsList.innerHTML='<div class="empty" style="padding:20px;">No rooms found on platform.</div>';
 return;
 }

 const makeRoomRow=(rid,r,type)=>`
 <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--b1);gap:10px;flex-wrap:wrap;"><div><div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:600;">${r.name||r.roomName||rid}</span><span class="room-type-pill ${type}">${type==='auction'?' Auction':' Draft'}</span></div><div style="font-size:.75rem;color:var(--dim);margin-top:2px;">ID: <code style="background:var(--g1);padding:1px 5px;border-radius:3px;">${rid}</code>${r._ownerUid?' . Owner: '+r._ownerUid.substring(0,8)+'...':''}
 ${r.createdAt?' . '+new Date(r.createdAt).toLocaleDateString():''}
 </div></div><div style="display:flex;gap:8px;flex-shrink:0;"><button class="btn btn-ghost btn-sm" onclick="window.saViewRoom('${rid}','${type}')" style="font-size:.72rem;">View</button><button class="btn btn-danger btn-sm" onclick="window.saDeleteRoom('${rid}','${type}','${(r.name||r.roomName||rid).replace(/'/g,"\\'")}')" style="font-size:.72rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Delete</button></div></div>`;

 roomsList.innerHTML=
 `<div style="padding:8px 20px;background:rgba(0,0,0,.2);font-size:.72rem;color:var(--dim2);text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Auction Rooms (${aEntries.length})</div>`+
 (aEntries.length?aEntries.map(([rid,r])=>makeRoomRow(rid,r,'auction')).join(''):'<div class="empty" style="padding:14px 20px;">No auction rooms.</div>')+
 `<div style="padding:8px 20px;background:rgba(0,0,0,.2);font-size:.72rem;color:var(--dim2);text-transform:uppercase;letter-spacing:.06em;font-weight:600;">Draft Rooms (${dEntries.length})</div>`+
 (dEntries.length?dEntries.map(([rid,r])=>makeRoomRow(rid,r,'draft')).join(''):'<div class="empty" style="padding:14px 20px;">No draft rooms.</div>');

 }catch(e){
 if(roomsList) roomsList.innerHTML=`<div class="empty" style="padding:20px;color:var(--err);">Error: ${e.message}</div>`;
 console.error('SA panel error:',e);
 }
}

// -- Push scorecard to EVERY room on platform --
window.saPushToAll=async function(){
 if(!isSuperAdmin()) return;
 const mid=document.getElementById('saScorecardSelect')?.value;
 const statusEl=document.getElementById('saPushStatus');
 if(!mid){statusEl.className='ai-status fail';statusEl.textContent='Select a scorecard first.';return;}

 statusEl.className='ai-status parsing';
 statusEl.textContent=' Scanning all rooms and pushing...';

 try{
 // Fetch the scorecard record
 const scSnap=await get(ref(db,`users/${user.uid}/scorecards/${mid}`));
 if(!scSnap.exists()){statusEl.className='ai-status fail';statusEl.textContent='\u274c Scorecard not found.';return;}
 const matchRecord=scSnap.val();

 // Scan all users to find all room IDs
 const usersSnap=await get(ref(db,'users'));
 const usersData=usersSnap.val()||{};

 const fanOut={};
 let aCount=0, dCount=0;

 Object.values(usersData).forEach(udata=>{
 if(udata.auctions) Object.keys(udata.auctions).forEach(rid=>{ fanOut[`auctions/${rid}/matches/${mid}`]=matchRecord; aCount++; });
 if(udata.drafts) Object.keys(udata.drafts).forEach(rid=>{ fanOut[`drafts/${rid}/matches/${mid}`]=matchRecord; dCount++; });
 });

 if(!Object.keys(fanOut).length){
 statusEl.className='ai-status fail';
 statusEl.textContent='No rooms found on the platform.';
 return;
 }

 await update(ref(db),fanOut);
 statusEl.className='ai-status done';
 statusEl.textContent=`"${matchRecord.label}" pushed to ${aCount} auction + ${dCount} draft rooms across the entire platform.`;

 }catch(e){
 statusEl.className='ai-status fail';
 statusEl.textContent=`\u274c Push failed: ${e.message}`;
 }
};

// -- View a room (navigate into it) --
window.saViewRoom=function(rid,type){
 if(!isSuperAdmin()) return;
 if(type==='auction') window.location.search=`?room=${rid}`;
 else window.location.search=`?draft=${rid}`;
};

// -- Delete any room (super admin power) --
window.saDeleteRoom=async function(rid,type,name){
 if(!isSuperAdmin()) return;
 if(!confirm(`Delete ${type} room "${name}" (${rid})?\n\nThis permanently removes the room and ALL its data.`)) return;
 try{
 const path=type==='auction'?`auctions/${rid}`:`drafts/${rid}`;
 await remove(ref(db,path));
 // Also remove from all users' room lists
 const usersSnap=await get(ref(db,'users'));
 const usersData=usersSnap.val()||{};
 const cleanUp={};
 const userKey=type==='auction'?'auctions':'drafts';
 const joinedKey=type==='auction'?'joined':'joinedDrafts';
 Object.keys(usersData).forEach(uid=>{
 cleanUp[`users/${uid}/${userKey}/${rid}`]=null;
 cleanUp[`users/${uid}/${joinedKey}/${rid}`]=null;
 });
 await update(ref(db),cleanUp);
 window.showAlert(`Room "${name}" deleted.`,'ok');
 renderSuperAdminPanel();
 }catch(e){ window.showAlert('Delete failed: '+e.message); }
};

// -- Super admin: show match info when scorecard selected --
window.saOnScorecardSelect=async function(){
 const mid=document.getElementById('saScorecardSelect')?.value;
 const infoBox=document.getElementById('saMatchInfo');
 const infoText=document.getElementById('saMatchInfoText');
 if(!mid||!infoBox){if(infoBox)infoBox.style.display='none';return;}
 try{
 const snap=await get(ref(db,`users/${user.uid}/scorecards/${mid}`));
 if(!snap.exists()){infoBox.style.display='none';return;}
 const m=snap.val();
 const playerCount=m.players?Object.keys(m.players).length:0;
 infoBox.style.display='block';
 infoText.innerHTML=`<strong style="color:var(--accent)">${m.label||mid}</strong>&nbsp;.&nbsp; Winner: ${m.winner||'--'} &nbsp;.&nbsp; MOTM: ${m.motm||'--'} &nbsp;.&nbsp; ${playerCount} players scored`;
 }catch(e){ infoBox.style.display='none'; }
};

// -- Delete from all rooms (without deleting scorecard record) --
window.saDeleteMatchFromAll=async function(){
 if(!isSuperAdmin()) return;
 const mid=document.getElementById('saScorecardSelect')?.value;
 const statusEl=document.getElementById('saPushStatus');
 if(!mid){statusEl.className='ai-status fail';statusEl.textContent='Select a scorecard first.';return;}
 if(!confirm('Remove this match from ALL rooms on the platform?\n\nThe scorecard record will remain in your Scorecards list.')) return;
 statusEl.className='ai-status parsing';
 statusEl.textContent=' Removing match from all rooms...';
 try{
 const usersSnap=await get(ref(db,'users'));
 const usersData=usersSnap.val()||{};
 const fanOut={};
 let aCount=0,dCount=0;
 Object.values(usersData).forEach(udata=>{
 if(udata.auctions) Object.keys(udata.auctions).forEach(rid=>{ fanOut[`auctions/${rid}/matches/${mid}`]=null; aCount++; });
 if(udata.drafts) Object.keys(udata.drafts).forEach(rid=>{ fanOut[`drafts/${rid}/matches/${mid}`]=null; dCount++; });
 });
 if(!Object.keys(fanOut).length){statusEl.className='ai-status fail';statusEl.textContent='No rooms found.';return;}
 await update(ref(db),fanOut);
 statusEl.className='ai-status done';
 statusEl.textContent=`Match removed from ${aCount} auction + ${dCount} draft rooms.`;
 }catch(e){statusEl.className='ai-status fail';statusEl.textContent=`\u274c ${e.message}`;}
};


window.toggleDark=function(){
 const dark=document.body.classList.toggle('dark');
 localStorage.setItem('ipl-theme',dark?'dark':'light');
 const b=document.getElementById('darkToggle');
 if(b) b.innerHTML=dark?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
};
(function(){
 if(localStorage.getItem('ipl-theme')==='dark'){
  document.body.classList.add('dark');
  document.addEventListener('DOMContentLoaded',function(){
   const b=document.getElementById('darkToggle');
   if(b)b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  });
 }
})();



// Patch after any analytics render
const _origRAD = window.renderAnalyticsDraft;
if(_origRAD) window.renderAnalyticsDraft = function(...args){ _origRAD(...args); setTimeout(patchDarkCards,50); };
const _origRA = window.renderAnalytics;
if(_origRA) window.renderAnalytics = function(...args){ _origRA(...args); setTimeout(patchDarkCards,50); };


// -- SA: Overseas Limit Tweaker --
window.saPopulateOsRooms=async function(){
  const sel=document.getElementById('saOsRoomSelect');
  if(!sel) return;
  try{
    const usersSnap=await get(ref(db,'users'));
    const users=usersSnap.val()||{};
    const roomIds=new Set();
    Object.values(users).forEach(u=>{
      if(u.auctions) Object.keys(u.auctions).forEach(rid=>roomIds.add(rid));
    });
    sel.innerHTML='<option value="">-- Select a room --</option>';
    for(const rid of roomIds){
      const nameSnap=await get(ref(db,`auctions/${rid}/roomName`));
      const name=nameSnap.val()||`Room ${rid.substring(0,6)}`;
      const osSnap=await get(ref(db,`auctions/${rid}/maxOverseas`));
      const curOs=osSnap.val()??8;
      const o=document.createElement('option');
      o.value=rid;
      o.textContent=`${name} (limit: ${curOs})`;
      sel.appendChild(o);
    }
  }catch(e){console.error('saPopulateOsRooms:',e);}
};

window.saSetOverseasLimit=async function(){
  const rid=document.getElementById('saOsRoomSelect')?.value;
  const limit=parseInt(document.getElementById('saOsLimit')?.value)||8;
  const st=document.getElementById('saOsStatus');
  if(!rid){if(st){st.className='ai-status fail';st.textContent='Select a room first.';}return;}
  if(limit<1||limit>15){if(st){st.className='ai-status fail';st.textContent='Limit must be 1-15.';}return;}
  if(st){st.className='ai-status parsing';st.textContent='Applying...';}
  try{
    const upd={};
    upd[`auctions/${rid}/maxOverseas`]=limit;
    upd[`auctions/${rid}/setup/maxOverseas`]=limit;
    await update(ref(db),upd);
    if(st){st.className='ai-status done';st.textContent=`Overseas limit set to ${limit} -- takes effect immediately.`;}
    await window.saPopulateOsRooms();
  }catch(e){if(st){st.className='ai-status fail';st.textContent=`\u274c ${e.message}`;}}
};

function renderPlayersSeason(data){
  if(!data) return;
  const grid=document.getElementById('playerSeasonGrid');
  if(!grid) return;
  const matches=data.matches||{};
  // Sort matches by timestamp
  const sortedMatches=Object.entries(matches)
    .sort((a,b)=>(a[1].timestamp||0)-(b[1].timestamp||0));
  const matchCount=sortedMatches.length;

  // Build playerPts map: playerName_lower -> [pts per match in order, or null if not played]
  const playerMatchPts={};
  sortedMatches.forEach(([mid,m],mi)=>{
    if(!m?.players) return;
    Object.values(m.players).forEach(p=>{
      const key=(p.name||'').toLowerCase();
      if(!key) return;
      if(!playerMatchPts[key]) playerMatchPts[key]=new Array(matchCount).fill(null);
      playerMatchPts[key][mi]=(p.pts||0);
    });
  });

  const teams=data.teams?Object.values(data.teams):[];
  if(!teams.length){
    grid.innerHTML='<div class="pst-no-data">No teams yet.</div>';return;
  }
  if(!matchCount){
    grid.innerHTML='<div class="pst-no-data">No match data yet -- add scorecards in the Points tab.</div>';return;
  }

  // Match header labels
  const matchHeaders=sortedMatches.map(([mid,m],i)=>`<th>M${i+1}<div style="font-size:.56rem;font-weight:400;color:var(--dim);text-transform:none;letter-spacing:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;" title="${m.label||mid}">${(m.label||mid).substring(0,12)+(m.label&&m.label.length>12?'...':'')}</div></th>`).join('');

  grid.innerHTML=teams.map(team=>{
    const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
    if(!roster.length) return `<div class="pst-team-section"><div class="pst-team-hdr"><span class="pst-team-name">${team.name}</span><span class="pst-owner">0 players</span></div><div class="pst-wrap"><div class="pst-no-data">No players</div></div></div>`;

    let teamTotal=0;
    const rows=roster.map(p=>{
      const key=(p.name||p.n||'').toLowerCase();
      const ptsArr=playerMatchPts[key]||new Array(matchCount).fill(null);
      const total=ptsArr.reduce((s,v)=>s+(v||0),0);
      teamTotal+=total;
      const cells=ptsArr.map(v=>v===null?`<td class="pst-pts-zero">--</td>`:`<td class="${v>0?'pst-pts-cell':'pst-pts-zero'}">${v>0?'+':''}${v}</td>`).join('');
      const iplTeam=p.iplTeam||p.t||'';
      const isOs=p.isOverseas||p.o;
      return `<tr>
        <td>${p.name||p.n||'--'}${iplTeam?`<span class="pst-iplteam">${iplTeam}</span>`:''}${isOs?'<span class="pst-os">OS</span>':''}</td>
        ${cells}
        <td class="pst-total-cell">+${total}</td>
      </tr>`;
    }).join('');

    return `<div class="pst-team-section">
      <div class="pst-team-hdr">
        <span class="pst-team-name">${team.name}</span>
        <span class="pst-owner">${roster.length} players</span>
        <span style="margin-left:auto;font-size:.78rem;font-weight:600;color:var(--ok)">Total: +${teamTotal} pts</span>
      </div>
      <div class="pst-wrap"><table class="pst-table">
        <thead><tr><th>Player</th>${matchHeaders}<th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  }).join('');
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// CRICBUZZ LIVE IMPORT -- Super Admin
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
const CBZ_KEY  = '6d53928bfdmsh545332aded830a3p11bdaajsncf079fc57095';
const CBZ_HOST = 'cricbuzz-cricket.p.rapidapi.com';
const CBZ_BASE = 'https://cricbuzz-cricket.p.rapidapi.com';

let cbzSelectedMatchId = null;
let cbzSelectedMatchLabel = '';
let cbzParsedScorecard = null;  // {innings: [{batting, bowling, fielding, inningsLabel}]}
let cbzActiveInningsIdx = 0;

async function cbzFetch(path){
  const res = await fetch(CBZ_BASE + path, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': CBZ_HOST,
      'x-rapidapi-key': CBZ_KEY,
    }
  });
  if(!res.ok) throw new Error(`HTTP ${res.status} from Cricbuzz API`);
  return res.json();
}

// -- Helpers --
function cbzSetStatus(id, msg, cls=''){
  const el=document.getElementById(id);
  if(el){ el.textContent=msg; el.className='cbz-status '+(cls||''); }
}

function cbzNormalizeOvers(ov){
  // Convert cricket overs notation: 3.3 = 3 overs 3 balls = 3 + 3/6 true overs
  const parts=String(ov).split('.');
  const o=parseInt(parts[0])||0;
  const b=parseInt(parts[1])||0;
  return o + b/6;
}

// -- Step 1: Fetch matches --
async function cbzLoadMatches(endpoint){
  cbzSetStatus('cbzMatchStatus', 'Loading matches...', 'loading');
  document.getElementById('cbzMatchList').innerHTML='';
  try{
    const data = await cbzFetch(endpoint);
    // Cricbuzz wraps matches in typeMatches -> seriesMatches -> matches
    const allMatches=[];
    (data.typeMatches||[]).forEach(type=>{
      (type.seriesMatches||[]).forEach(sm=>{
        const series=sm.seriesAdWrapper||sm;
        (series.matches||[]).forEach(m=>{
          const mi=m.matchInfo||{};
          const ms=m.matchScore||{};
          // Only include IPL / T20 type if possible, else include all
          allMatches.push({
            matchId: mi.matchId,
            teams: `${mi.team1?.teamSName||mi.team1?.teamsname||'?'} vs ${mi.team2?.teamSName||mi.team2?.teamsname||'?'}`,
            series: series.seriesName||mi.seriesName||series.seriesname||mi.seriesname||'',
            venue: mi.venueInfo?.ground||mi.venueinfo?.ground||'',
            state: mi.state||'',
            status: mi.status||'',
            score1: ms.team1Score?.inngs1 ? `${ms.team1Score.inngs1.runs}/${ms.team1Score.inngs1.wickets}` : '',
            score2: ms.team2Score?.inngs1 ? `${ms.team2Score.inngs1.runs}/${ms.team2Score.inngs1.wickets}` : '',
          });
        });
      });
    });

    if(!allMatches.length){
      cbzSetStatus('cbzMatchStatus', 'No matches found.', 'fail');
      return;
    }
    cbzSetStatus('cbzMatchStatus', `${allMatches.length} match${allMatches.length===1?'':'es'} loaded -- click one to select.`, 'done');
    const grid=document.getElementById('cbzMatchList');
    grid.innerHTML='';
    allMatches.forEach(m=>{
      const pill=document.createElement('div');
      pill.className='match-pill';
      const scores=m.score1||m.score2 ? `${m.score1} -- ${m.score2}` : '';
      const isLive=m.state==='In Progress'||m.state==='live';
      pill.innerHTML=`
        <div class="match-pill-teams">${m.teams}</div>
        ${scores?`<div class="match-pill-meta">${scores}</div>`:''}
        ${isLive?'<div class="match-pill-live">LIVE</div>':''}
        <div class="match-pill-meta" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;" title="${m.series}">${m.series.substring(0,22)}${m.series.length>22?'...':''}</div>`;
      pill.onclick=()=>{
        document.querySelectorAll('.match-pill').forEach(p=>p.classList.remove('selected'));
        pill.classList.add('selected');
        cbzSelectedMatchId = m.matchId;
        cbzSelectedMatchLabel = m.teams;
        document.getElementById('cbzSelectedMatchLabel').textContent = m.teams;
        document.getElementById('cbzSelectedMatchMeta').textContent = m.series + (m.venue?' . '+m.venue:'');
        document.getElementById('cbzStep2').style.display='block';
        document.getElementById('cbzStep3').style.display='none';
        document.getElementById('cbzStep4').style.display='none';
        cbzSetStatus('cbzScorecardStatus','');
      };
      grid.appendChild(pill);
    });
  }catch(e){
    cbzSetStatus('cbzMatchStatus', `\u274c ${e.message}`, 'fail');
  }
}

window.cbzFetchLive     = ()=>cbzLoadMatches('/matches/v1/live');
window.cbzFetchRecent   = ()=>cbzLoadMatches('/matches/v1/recent');
window.cbzFetchUpcoming = ()=>cbzLoadMatches('/matches/v1/upcoming');

// -- Step 2: Fetch scorecard --
window.cbzFetchScorecard = async function(){
  if(!cbzSelectedMatchId)return;
  cbzSetStatus('cbzScorecardStatus','Fetching scorecard from Cricbuzz...','loading');
  document.getElementById('cbzStep3').style.display='none';
  document.getElementById('cbzStep4').style.display='none';
  try{

    const [scardData,infoData]=await Promise.all([
      cbzFetch(`/mcenter/v1/${cbzSelectedMatchId}/scard`),
      cbzFetch(`/mcenter/v1/${cbzSelectedMatchId}`),
    ]);

    // -- Match meta -- info is a FLAT object (no matchHeader wrapper) --
    const winnerTeam = (infoData.shortstatus||'').replace(' won','').trim();
    const motm       = '';  // not available in this endpoint
    const resultStr  = infoData.state==='Complete' ? 'normal' : 'noresult';
    const matchLbl   = `${cbzSelectedMatchLabel} -- ${infoData.seriesname||''}`;

    // -- Innings -- scorecard (lowercase) is a flat array --
    const innings=[];
    (scardData.scorecard||[]).forEach((inn,ii)=>{
      const innLabel = inn.batteamname || `Innings ${ii+1}`;
      const batting  = [];
      const bowling  = [];
      const fielding = {};

      // Batting -- flat array of batsman objects
      (inn.batsman||[]).forEach(b=>{
        const outdec = b.outdec||'';
        const dismissal = !outdec || outdec==='' ? 'notout' :
          outdec.toLowerCase().includes('run out') ? 'runout' :
          outdec.toLowerCase().includes('stumped')  ? 'stumped' :
          outdec.toLowerCase().includes('not out')  ? 'notout' : 'out';
        batting.push({
          name     : b.name,
          runs     : b.runs,
          balls    : b.balls,
          fours    : b.fours,
          sixes    : b.sixes,
          sr       : b.strkrate,
          dismissal,
        });
        // Auto-extract fielding from dismissal text
        const catchM  = outdec.match(/^c ([^b]+) b /i);
        const stumpM  = outdec.match(/^st ([^b]+) b /i);
        const runoutM = outdec.match(/run out[^(]*\(([^)]+)\)/i);
        if(catchM) { const f=catchM[1].trim();  if(!fielding[f]) fielding[f]={name:f,catches:0,stumpings:0,runouts:0}; fielding[f].catches++; }
        if(stumpM) { const f=stumpM[1].trim();  if(!fielding[f]) fielding[f]={name:f,catches:0,stumpings:0,runouts:0}; fielding[f].stumpings++; }
        if(runoutM){ const f=runoutM[1].trim(); if(!fielding[f]) fielding[f]={name:f,catches:0,stumpings:0,runouts:0}; fielding[f].runouts++; }
      });

      // Bowling -- flat array of bowler objects
      (inn.bowler||[]).forEach(bw=>{
        const overs  = bw.overs||0;
        const runs   = parseInt(bw.runs)||0;
        const eco    = parseFloat(bw.economy)||0;
        // dots: API returns 0, calculate from balls - (scoring balls)
        // balls = bw.balls, but dots not reliable from API -- leave as 0
        bowling.push({
          name    : bw.name,
          overs   : overs,
          runs    : runs,
          wickets : bw.wickets,
          economy : eco.toFixed(2),
          econ    : eco.toFixed(2),
          economyRate: eco.toFixed(2),
          dots    : bw.dots||0,
          maidens : bw.maidens||0,
        });
      });

      innings.push({inningsLabel:innLabel, batting, bowling, fielding:Object.values(fielding)});
    });

    cbzParsedScorecard = { innings, winnerTeam, motm, resultStr, matchLbl };
    cbzSetStatus('cbzScorecardStatus', `\u2705 Scorecard loaded -- ${innings.length} innings found.`, 'done');

    // Show innings selector
    const btnContainer = document.getElementById('cbzInningsButtons');
    btnContainer.innerHTML='';
    innings.forEach((inn,i)=>{
      const btn=document.createElement('button');
      btn.className='btn btn-sm '+(i===0?'btn-gold':'btn-outline');
      btn.style.width='auto';
      btn.textContent=inn.inningsLabel;
      btn.onclick=()=>{
        cbzActiveInningsIdx=i;
        btnContainer.querySelectorAll('button').forEach((b,bi)=>{
          b.className='btn btn-sm '+(bi===i?'btn-gold':'btn-outline');
        });
        cbzRenderPreview(i);
      };
      btnContainer.appendChild(btn);
    });

    document.getElementById('cbzStep3').style.display='block';
    cbzRenderPreview(0);

    // Show step 4 with a lazy-load button for rooms (no auto API call)
    document.getElementById('cbzStep4').style.display='block';
    document.getElementById('cbzRoomSelect').innerHTML='<option value="">-- Click Load Rooms to populate --</option>';
  }catch(e){
    cbzSetStatus('cbzScorecardStatus', `\u274c ${e.message}`, 'fail');
  }
};

// -- Preview scorecard --
function cbzRenderPreview(idx){
  const inn = cbzParsedScorecard?.innings?.[idx];
  if(!inn)return;
  const prev=document.getElementById('cbzPreview');
  let html=`<div class="cbz-inn-header">${inn.inningsLabel} -- Batting</div>
  <table class="cbz-preview-table">
    <thead><tr><th>Player</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Dismissal</th></tr></thead>
    <tbody>
    ${inn.batting.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.sr||'--'}</td><td style="font-size:.72rem;color:var(--dim)">${b.dismissal}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="cbz-inn-header" style="margin-top:12px;">Bowling</div>
  <p style="font-size:.70rem;color:var(--warn);margin:4px 0 6px;">\u26a0 Dot balls not available from Cricbuzz summary API -- enter manually in the Scorecards form after importing.</p>
  <table class="cbz-preview-table">
    <thead><tr><th>Bowler</th><th>Ov</th><th>R</th><th>W</th><th>Eco</th><th>0s</th><th>Mdns</th></tr></thead>
    <tbody>
    ${inn.bowling.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.overs}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${b.economy}</td><td style="color:var(--warn)">--</td><td>${b.maidens}</td></tr>`).join('')}
    </tbody>
  </table>`;
  if(inn.fielding.length){
    html+=`<div class="cbz-inn-header" style="margin-top:12px;">Fielding (auto-extracted)</div>
    <table class="cbz-preview-table">
      <thead><tr><th>Player</th><th>Catches</th><th>Stumpings</th><th>Run-outs</th></tr></thead>
      <tbody>${inn.fielding.map(f=>`<tr><td>${f.name}</td><td>${f.catches||0}</td><td>${f.stumpings||0}</td><td>${f.runouts||0}</td></tr>`).join('')}</tbody>
    </table>`;
  }
  prev.innerHTML=html;
}

// -- Populate room selector -- only called on explicit user click --
window.cbzPopulateRoomsManual=async function(){
  const sel=document.getElementById('cbzRoomSelect');
  if(sel) sel.innerHTML='<option value="">Loading rooms...</option>';
  await cbzPopulateRooms();
};

async function cbzPopulateRooms(){
  const sel=document.getElementById('cbzRoomSelect');
  if(!sel)return;
  try{
    const usersSnap=await get(ref(db,'users'));
    const users=usersSnap.val()||{};
    const roomIds=new Set();
    Object.values(users).forEach(u=>{ if(u.auctions) Object.keys(u.auctions).forEach(rid=>roomIds.add(rid)); });
    sel.innerHTML='<option value="">-- Select a room --</option>';
    for(const rid of roomIds){
      const nameSnap=await get(ref(db,`auctions/${rid}/roomName`));
      const name=nameSnap.val()||`Room ${rid.substring(0,6)}`;
      const o=document.createElement('option');
      o.value=rid; o.textContent=name;
      sel.appendChild(o);
    }
  }catch(e){ console.error('cbzPopulateRooms:',e); }
}

// -- Step 4: Populate global scorecard form so admin can edit then push to all rooms --
window.cbzPushToRoom = function(){
  const innings=cbzParsedScorecard?.innings||[];
  if(!innings.length){ cbzSetStatus('cbzPushStatus','No innings data loaded.','fail'); return; }
  cbzSetStatus('cbzPushStatus','Populating Scorecards tab with all innings...','loading');

  if(typeof window.switchDashTab==='function') window.switchDashTab('scorecards');

  setTimeout(()=>{
    const fb=document.getElementById('gscFormBody');
    if(fb) fb.style.display='block';

    const sv=(id,v)=>{ const el=document.getElementById(id); if(el&&v!=null&&v!=='') el.value=v; };

    // Meta fields
    sv('gscMatchLabel', cbzParsedScorecard.matchLbl);
    sv('gscWinner',     cbzParsedScorecard.winnerTeam);
    const res=document.getElementById('gscResult');
    if(res&&cbzParsedScorecard.resultStr)
      [...res.options].forEach(o=>{ if(o.value===cbzParsedScorecard.resultStr) o.selected=true; });

    // -- Simple concatenation: Inn1 first, Inn2 after --
    // Batting: all batsmen from Inn1, then all batsmen from Inn2
    const allBatting  = innings.flatMap(inn=>(inn.batting||[]));
    // Bowling: all bowlers from Inn1, then all bowlers from Inn2
    const allBowling  = innings.flatMap(inn=>(inn.bowling||[]));
    // Fielding: all fielders from Inn1, then all fielders from Inn2
    const allFielding = innings.flatMap(inn=>(inn.fielding||[]));

    // Clear and reset
    document.getElementById('gscBattingRows').innerHTML='';
    document.getElementById('gscBowlingRows').innerHTML='';
    document.getElementById('gscFieldingRows').innerHTML='';
    gscBattingCount=0; gscBowlingCount=0; gscFieldingCount=0;

    // Populate batting (Inn1 batsmen first, then Inn2 batsmen)
    allBatting.forEach(b=>{
      window.addGscBattingRow();
      const id=gscBattingCount-1;
      sv(`gscbr${id}name`,  b.name||'');
      sv(`gscbr${id}runs`,  b.runs??'');
      sv(`gscbr${id}balls`, b.balls??'');
      sv(`gscbr${id}fours`, b.fours??'');
      sv(`gscbr${id}sixes`, b.sixes??'');
      const dis=document.getElementById(`gscbr${id}dis`);
      if(dis)[...dis.options].forEach(o=>{ if(o.value===(b.dismissal||'out')) o.selected=true; });
    });

    // Populate bowling (Inn1 bowlers first, then Inn2 bowlers)
    allBowling.forEach(bw=>{
      window.addGscBowlingRow();
      const id=gscBowlingCount-1;
      sv(`gscbow${id}name`,   bw.name||'');
      sv(`gscbow${id}overs`,  bw.overs??'');
      sv(`gscbow${id}runs`,   bw.runs??'');
      sv(`gscbow${id}wkts`,   bw.wickets??'');
      sv(`gscbow${id}maidens`,bw.maidens??'');
      if(bw.economy){
        const eEl=document.getElementById(`gscbow${id}eco`);
        if(eEl){ eEl.value=parseFloat(bw.economy).toFixed(2); eEl.dataset.manual='1'; }
      }
    });

    // Populate fielding (Inn1 fielders first, then Inn2 fielders)
    allFielding.forEach(f=>{
      if((f.catches||0)+(f.stumpings||0)+(f.runouts||0)===0) return;
      window.addGscFieldingRow();
      const id=gscFieldingCount-1;
      sv(`gscfld${id}name`,      f.name||'');
      sv(`gscfld${id}catches`,   f.catches||'');
      sv(`gscfld${id}stumpings`, f.stumpings||'');
      sv(`gscfld${id}runouts`,   f.runouts||'');
    });

    cbzSetStatus('cbzPushStatus',`\u2705 ${allBatting.length} batters . ${allBowling.length} bowlers . ${allFielding.filter(f=>f.catches||f.stumpings||f.runouts).length} fielders from ${innings.length} innings. Add dot balls then Save & Push.`,'done');
  }, 300);
};;;;;


// -- Render all innings combined in preview --
function cbzRenderAllInnings(){
  const innings=cbzParsedScorecard?.innings||[];
  const prev=document.getElementById('cbzPreview');
  if(!prev||!innings.length) return;
  let html='';
  innings.forEach((inn,i)=>{
    html+=`<div class="cbz-inn-header" style="${i>0?'margin-top:18px;':''}${i===0?'':'border-top:1px solid var(--b1);padding-top:12px;'}">${inn.inningsLabel} -- Batting</div>
    <table class="cbz-preview-table">
      <thead><tr><th>Player</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Dismissal</th></tr></thead>
      <tbody>${inn.batting.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.sr||'--'}</td><td style="font-size:.72rem;color:var(--dim)">${b.dismissal}</td></tr>`).join('')}</tbody>
    </table>
    <div class="cbz-inn-header" style="margin-top:10px;">${inn.inningsLabel} -- Bowling</div>
    <p style="font-size:.70rem;color:var(--warn);margin:3px 0 5px;">\u26a0 Dot balls not available from API -- enter manually.</p>
    <table class="cbz-preview-table">
      <thead><tr><th>Bowler</th><th>Ov</th><th>R</th><th>W</th><th>Eco</th><th>Mdns</th></tr></thead>
      <tbody>${inn.bowling.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.overs}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${b.economy}</td><td>${b.maidens}</td></tr>`).join('')}</tbody>
    </table>`;
    if(inn.fielding.length){
      html+=`<div class="cbz-inn-header" style="margin-top:10px;">${inn.inningsLabel} -- Fielding</div>
      <table class="cbz-preview-table">
        <thead><tr><th>Player</th><th>Catches</th><th>Stumpings</th><th>Run-outs</th></tr></thead>
        <tbody>${inn.fielding.map(f=>`<tr><td>${f.name}</td><td>${f.catches||0}</td><td>${f.stumpings||0}</td><td>${f.runouts||0}</td></tr>`).join('')}</tbody>
      </table>`;
    }
  });
  prev.innerHTML=html;
}



// MY TEAM A -- simple synchronous render
let _sqSavedA = null; // cached Firebase squad
let _sqHistA  = [];

function _myRosterA(){
  var st = roomState;
  if(!st) return [];
  var tn = (user && st.members && st.members[user.uid] && st.members[user.uid].teamName) || myTeamName || '';
  if(!tn) return [];
  if(!myTeamName && tn) myTeamName = tn;
  var team = st.teams && st.teams[tn];
  if(!team && st.teams){
    var tnL = tn.trim().toLowerCase();
    var match = Object.keys(st.teams).find(function(k){ return k.trim().toLowerCase() === tnL; });
    if(match) team = st.teams[match];
  }
  if(!team) return [];
  var r = team.roster;
  if(!r) return [];
  return Array.isArray(r) ? r : Object.values(r);
}

function _mtRenderA(){
  var el = document.getElementById('mt_body_A');
  if(!el) return;

  var roster = _myRosterA();

  if(!roster.length){
    var st = roomState;
    var tn = (user && st && st.members && st.members[user.uid] && st.members[user.uid].teamName) || myTeamName || '';
    if(!st || !tn){
      el.innerHTML = '<div style="padding:28px;text-align:center;color:var(--dim);font-size:.84rem;line-height:1.8;"><div style="font-size:2rem;margin-bottom:8px;">&#x1F44B;</div><strong style="color:var(--txt);">Register first</strong><br>Go to the Setup tab to get started.</div>';
    } else {
      el.innerHTML = '<div style="padding:28px;text-align:center;color:var(--dim);font-size:.84rem;line-height:1.8;"><div style="font-size:2rem;margin-bottom:8px;">&#x1F3CF;</div><strong style="color:var(--txt);">No players yet</strong><br>Your roster will appear here once players join <strong style="color:var(--accent);">' + tn + '</strong>.</div>';
    }
    return;
  }

  function pData(name){ return roster.find(function(x){ return (x.name||x.n||'')===name; })||{}; }
  function pRole(name){ return (pData(name).role||pData(name).r||'').toLowerCase(); }
  function pOs(name){ var p=pData(name); return !!(p.isOverseas||p.o||name.indexOf('*')>=0); }
  function canBowl(name){ var r=pRole(name); return r.indexOf('bowler')>=0||r.indexOf('all-rounder')>=0||r.indexOf('all rounder')>=0; }
  function isWk(name){ var r=pRole(name); return r.indexOf('wicketkeeper')>=0||r.indexOf('keeper')>=0; }

  var allNames = roster.map(function(p){ return p.name||p.n||''; });

  var sq = _sqSavedA;
  if(!sq || !sq.xi){
    var _xiEnd = Math.min(11, allNames.length);
    var _benchEnd = Math.min(_xiEnd + 5, allNames.length);
    sq = { xi: allNames.slice(0, _xiEnd), bench: allNames.slice(_xiEnd, _benchEnd), reserves: allNames.slice(_benchEnd) };
  } else {
    var assigned = new Set(sq.xi.concat(sq.bench).concat(sq.reserves));
    allNames.forEach(function(n){ if(!assigned.has(n)) sq.reserves.push(n); });
    sq.xi       = sq.xi.filter(function(n){ return allNames.indexOf(n)>=0; });
    sq.bench    = sq.bench.filter(function(n){ return allNames.indexOf(n)>=0; });
    sq.reserves = sq.reserves.filter(function(n){ return allNames.indexOf(n)>=0; });
  }

  // Enforce: max 6 overseas in Playing 16 (XI + Bench combined)
  var playing16Os = sq.xi.filter(pOs).concat(sq.bench.filter(pOs));
  while(playing16Os.length > 6){
   // Remove from bench first, then XI
   var victim = null;
   var benchOs = sq.bench.filter(pOs);
   if(benchOs.length > 0){ victim = benchOs[benchOs.length-1]; sq.bench = sq.bench.filter(function(n){return n!==victim;}); }
   else { var xiOs = sq.xi.filter(pOs); victim = xiOs[xiOs.length-1]; sq.xi = sq.xi.filter(function(n){return n!==victim;}); }
   sq.reserves.push(victim);
   playing16Os = sq.xi.filter(pOs).concat(sq.bench.filter(pOs));
  }

  sq._rLen = allNames.length; _sqSavedA = sq;

  var xiCount = sq.xi.length, benchCount = sq.bench.length, resCount = sq.reserves.length;
  var xiOsCount = sq.xi.filter(pOs).length;
  var benchOsCount = sq.bench.filter(pOs).length;
  var xiBowlCount = sq.xi.filter(canBowl).length;
  var xiWkCount = sq.xi.filter(isWk).length;

  // Adapt rules to actual roster size
  var totalPlayers = allNames.length;
  var needBench = totalPlayers > 11;  // bench only required if >11 players
  var xiTarget = Math.min(11, totalPlayers);
  var benchTarget = needBench ? Math.min(5, totalPlayers - 11) : 0;

  var checks = [
    { label:'XI Size', val:xiCount+'/'+xiTarget, ok:xiCount===xiTarget }
  ];
  if(needBench) checks.push({ label:'Bench', val:benchCount+'/'+benchTarget, ok:benchCount===benchTarget });
  var p16OsCount = xiOsCount + benchOsCount;
  checks.push({ label:'Overseas (XI+Bench)', val:p16OsCount+'/6 max', ok:p16OsCount<=6 });
  if(xiCount>=5) checks.push({ label:'Bowlers XI', val:xiBowlCount+'/5 min', ok:xiBowlCount>=5 });
  checks.push({ label:'Keeper XI', val:xiWkCount+'/1 min', ok:xiWkCount>=1 });
  var allValid = checks.every(function(c){ return c.ok; });

  // Save validity to a global so leaderboard/points can check it
  window._squadValidA = allValid;

  var ptsMap = {};
  var matches = (roomState && roomState.matches) || {};
  Object.values(matches).forEach(function(m){
    if(!m||!m.players) return;
    Object.values(m.players).forEach(function(p){
      var k=(p.name||'').toLowerCase();
      ptsMap[k]=(ptsMap[k]||0)+(p.pts||0);
    });
  });

  // Tracker HTML
  var tHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px;padding:12px 16px;border-bottom:1px solid var(--b1);">';
  checks.forEach(function(c){
    var bg=c.ok?'var(--ok-bg)':'var(--err-bg)', bdr=c.ok?'var(--ok-bdr)':'var(--err-bdr)', col=c.ok?'var(--ok)':'var(--err)';
    tHtml += '<div style="padding:8px 10px;border-radius:var(--r);background:'+bg+';border:1px solid '+bdr+';text-align:center;">'
      + '<div style="font-size:.68rem;font-weight:600;color:'+col+';text-transform:uppercase;letter-spacing:.04em;">'+(c.ok?'&#10003;':'&#10007;')+' '+c.label+'</div>'
      + '<div style="font-size:.90rem;font-weight:700;color:'+col+';margin-top:2px;">'+c.val+'</div></div>';
  });
  tHtml += '</div>';

  var _isLocked=!!(roomState.squadLocked); var _isAdminUser=!!isAdmin;
  var statusHtml = allValid
    ? '<div style="padding:8px 16px;background:var(--ok-bg);border-bottom:1px solid var(--ok-bdr);font-size:.80rem;font-weight:600;color:var(--ok);text-align:center;">&#10003; Squad valid &mdash; all criteria met</div>'
    : '<div style="padding:8px 16px;background:var(--err-bg);border-bottom:1px solid var(--err-bdr);font-size:.80rem;font-weight:600;color:var(--err);text-align:center;">&#10007; Squad not valid &mdash; fix red criteria above. Team is DISQUALIFIED from scoring until valid.</div>';

  function row(name, sec){
    var p=pData(name), role=p.role||p.r||'', ipl=p.iplTeam||p.t||'', os=!!(p.isOverseas||p.o), pts=ptsMap[name.toLowerCase()]||0;
    var targets = sec==='xi' ? [['bench','Bench'],['reserves','Res']] : sec==='bench' ? [['xi','XI'],['reserves','Res']] : [['xi','XI'],['bench','Bench']];
    var btns = targets.map(function(tb){
      return '<button data-n="'+encodeURIComponent(name)+'" data-f="'+sec+'" data-t="'+tb[0]+'" onclick="window.mt_move_A(decodeURIComponent(this.dataset.n),this.dataset.f,this.dataset.t)" style="font-size:.67rem;padding:3px 9px;border-radius:20px;border:1px solid var(--b2);background:var(--g1);color:var(--txt2);cursor:pointer;font-family:var(--f);">&#8594;'+tb[1]+'</button>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--g2);border:1px solid var(--b0);border-radius:var(--r);margin-bottom:5px;">'
      + (os?'<span style="width:7px;height:7px;border-radius:50%;background:#F59E0B;flex-shrink:0;display:inline-block;"></span>':'')
      + '<span style="flex:1;font-size:.84rem;font-weight:600;color:var(--txt);">'+name+'</span>'
      + '<span style="font-size:.68rem;color:var(--dim);">'+ipl+'</span>'
      + '<span style="font-size:.68rem;padding:1px 6px;border-radius:10px;background:var(--accent-bg);color:var(--accent);font-weight:700;">'+role+'</span>'
      + '<span style="font-size:.72rem;font-weight:700;min-width:42px;text-align:right;color:'+(pts>0?'var(--ok)':pts<0?'var(--err)':'var(--dim)')+';">'+(pts>0?'+':'')+pts+'</span>'
      + '<div style="display:flex;gap:3px;">'+btns+'</div></div>';
  }

  function sec(title, col, key, badge){
    var players=sq[key]||[];
    return '<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;padding:8px 12px;border-radius:8px 8px 0 0;background:'+col+';"><span style="font-size:.84rem;font-weight:700;color:#fff;">'+title+'</span><span style="font-size:.75rem;color:rgba(255,255,255,.8);">'+badge+'</span></div>'
      + '<div style="background:var(--g1);border:1px solid var(--b1);border-top:none;border-radius:0 0 8px 8px;padding:8px;">'
      + (players.length ? players.map(function(n){return row(n,key);}).join('') : '<div style="padding:12px;text-align:center;color:var(--dim);font-size:.80rem;">Empty</div>')
      + '</div></div>';
  }

  var pxi=document.getElementById('mt_xi_A'); if(pxi) pxi.textContent='XI: '+xiCount+'/11';
  var pbn=document.getElementById('mt_bench_A'); if(pbn) pbn.textContent='Bench: '+benchCount+'/5';
  var prs=document.getElementById('mt_res_A'); if(prs) prs.textContent='Reserves: '+resCount;
  var vl=document.getElementById('mt_val_A'); if(vl) vl.style.display='none';

  var lockBanner=_isLocked?'<div style="padding:10px 16px;background:var(--warn-bg);border-bottom:1px solid var(--warn-bdr);font-size:.82rem;font-weight:600;color:var(--warn);text-align:center;">Squad changes are LOCKED by admin</div>':'';
  el.innerHTML = lockBanner + statusHtml + tHtml + '<div style="padding:12px;">'
    + sec('&#9889; Playing XI', 'linear-gradient(90deg,#4A35A0,#6C54C8)', 'xi', xiCount+'/11')
    + sec('&#129681; Bench', 'linear-gradient(90deg,#065F46,#059669)', 'bench', benchCount+'/5')
    + sec('&#128230; Reserves', 'linear-gradient(90deg,#374151,#6B7280)', 'reserves', resCount+'')
    + '</div>';
}




window.mt_move_A = function(name, from, to){
  if(roomState&&roomState.squadLocked&&!isAdmin){window.showAlert('Squad changes are locked by admin.');return;}
  const sq = _sqSavedA || {xi:[],bench:[],reserves:[]};
  _sqHistA.push(JSON.parse(JSON.stringify(sq)));
  var ub=document.getElementById('mt_undo_A'); if(ub) ub.style.display='flex';
  sq[from] = (sq[from]||[]).filter(function(n){return n!==name;});
  if(!sq[to]) sq[to]=[];
  sq[to].push(name);
  _sqSavedA = sq;
  _mtRenderA();
};

window.mt_undo_A = function(){
  if(!_sqHistA.length) return;
  _sqSavedA = _sqHistA.pop();
  if(!_sqHistA.length){var ub=document.getElementById('mt_undo_A');if(ub)ub.style.display='none';}
  _mtRenderA();
};

window.mt_save_A = async function(){
  if(roomState&&roomState.squadLocked&&!isAdmin){window.showAlert("Squad changes are locked by admin.");return;}
  if(!user||!roomId) return;
  const sq=_sqSavedA;
  if(!sq){window.showAlert('No squad to save.');return;}
  const r=_myRosterA();
  var msgs=[];
  var _xiTarget=Math.min(11,r.length), _needBench=r.length>11, _benchTarget=_needBench?Math.min(5,r.length-11):0;
  if(sq.xi.length!==_xiTarget) msgs.push('XI needs '+_xiTarget+' (has '+sq.xi.length+')');
  if(_needBench&&sq.bench.length!==_benchTarget) msgs.push('Bench needs '+_benchTarget+' (has '+sq.bench.length+')');
  function _pd(name){ return r.find(function(x){ return (x.name||x.n||'')===name; })||{}; }
  function _pr(name){ return (_pd(name).role||_pd(name).r||'').toLowerCase(); }
  function _po(name){ return !!(_pd(name).isOverseas||_pd(name).o); }
  function _cb(name){ var rl=_pr(name); return rl.indexOf('bowler')>=0||rl.indexOf('all-rounder')>=0||rl.indexOf('all rounder')>=0; }
  function _wk(name){ var rl=_pr(name); return rl.indexOf('wicketkeeper')>=0||rl.indexOf('keeper')>=0; }
  var xiOs=sq.xi.filter(_po).length, benchOs=sq.bench.filter(_po).length;
  var xiBowl=sq.xi.filter(_cb).length, xiWk=sq.xi.filter(_wk).length;
  var p16Os=xiOs+benchOs;
  if(p16Os>6) msgs.push('Playing 16 has '+p16Os+' overseas (max 6)');
  if(sq.xi.length===_xiTarget&&_xiTarget>=5&&xiBowl<5) msgs.push('XI needs 5+ bowlers/all-rounders (has '+xiBowl+')');
  if(sq.xi.length===_xiTarget&&xiWk<1) msgs.push('XI needs at least 1 wicketkeeper (has '+xiWk+')');
  if(msgs.length){if(myTeamName)update(ref(db,'auctions/'+roomId+'/teams/'+myTeamName),{squadValid:false}).catch(function(){});window.showAlert(msgs.join(' \u00b7 '));return;}
  try{
    await set(ref(db,'users/'+user.uid+'/squads/auctions/'+roomId),{xi:sq.xi,bench:sq.bench,savedAt:Date.now()});
    window.showAlert('Squad saved!','ok');
    if(myTeamName)update(ref(db,'auctions/'+roomId+'/teams/'+myTeamName),{squadValid:true}).catch(function(){});
    _sqHistA=[];
    var ub=document.getElementById('mt_undo_A');if(ub)ub.style.display='none';
  }catch(e){window.showAlert('Save failed: '+e.message);}
};

// Load saved squad from Firebase then render
window.renderMyTeamA = function(){
  if(_sqSavedA && _sqSavedA.xi){ _mtRenderA(); return; }
  if(user && roomId){
    get(ref(db,'users/'+user.uid+'/squads/auctions/'+roomId))
      .then(function(snap){
        var saved=snap.val();
        if(saved&&saved.xi&&saved.xi.length){
          var allNames=_myRosterA().map(function(p){return p.name||p.n||'';});
          var xi=(saved.xi||[]).filter(function(n){return allNames.indexOf(n)>=0;});
          var bench=(saved.bench||[]).filter(function(n){return allNames.indexOf(n)>=0&&xi.indexOf(n)<0;});
          var assigned=new Set(xi.concat(bench));
          _sqSavedA={xi:xi,bench:bench,reserves:allNames.filter(function(n){return!assigned.has(n);})}; 
        }
        _mtRenderA();
      }).catch(function(){ _mtRenderA(); });
  } else { _mtRenderA(); }
};


var IPL_SCHEDULE=[
{sr:1,date:"28 Mar",t1:"RCB",t2:"SRH",city:"Bengaluru",time:"19:30"},
{sr:2,date:"29 Mar",t1:"MI",t2:"KKR",city:"Mumbai",time:"19:30"},
{sr:3,date:"30 Mar",t1:"RR",t2:"CSK",city:"Guwahati",time:"19:30"},
{sr:4,date:"31 Mar",t1:"PBKS",t2:"GT",city:"Chandigarh",time:"19:30"},
{sr:5,date:"01 Apr",t1:"LSG",t2:"DC",city:"Lucknow",time:"19:30"},
{sr:6,date:"02 Apr",t1:"KKR",t2:"SRH",city:"Kolkata",time:"19:30"},
{sr:7,date:"03 Apr",t1:"CSK",t2:"PBKS",city:"Chennai",time:"19:30"},
{sr:8,date:"04 Apr",t1:"DC",t2:"MI",city:"Delhi",time:"15:30"},
{sr:9,date:"04 Apr",t1:"GT",t2:"RR",city:"Ahmedabad",time:"19:30"},
{sr:10,date:"05 Apr",t1:"SRH",t2:"LSG",city:"Hyderabad",time:"15:30"},
{sr:11,date:"05 Apr",t1:"RCB",t2:"CSK",city:"Bengaluru",time:"19:30"},
{sr:12,date:"06 Apr",t1:"KKR",t2:"PBKS",city:"Kolkata",time:"19:30"},
{sr:13,date:"07 Apr",t1:"RR",t2:"MI",city:"Guwahati",time:"19:30"},
{sr:14,date:"08 Apr",t1:"DC",t2:"GT",city:"Delhi",time:"19:30"},
{sr:15,date:"09 Apr",t1:"KKR",t2:"LSG",city:"Kolkata",time:"19:30"},
{sr:16,date:"10 Apr",t1:"RR",t2:"RCB",city:"Guwahati",time:"19:30"},
{sr:17,date:"11 Apr",t1:"PBKS",t2:"SRH",city:"Chandigarh",time:"15:30"},
{sr:18,date:"11 Apr",t1:"CSK",t2:"DC",city:"Chennai",time:"19:30"},
{sr:19,date:"12 Apr",t1:"LSG",t2:"GT",city:"Lucknow",time:"15:30"},
{sr:20,date:"12 Apr",t1:"MI",t2:"RCB",city:"Mumbai",time:"19:30"}
];
var TRADE_WINDOWS=[5, 13];
var TEAM_CLR={CSK:'#F9CD05',MI:'#004BA0',RCB:'#EC1C24',KKR:'#3A225D',DC:'#004C93',PBKS:'#ED1B24',RR:'#EA1A85',SRH:'#FF822A',GT:'#1C1C2B',LSG:'#A72056'};
var TEAM_TXT={CSK:'#000',MI:'#fff',RCB:'#fff',KKR:'#fff',DC:'#fff',PBKS:'#fff',RR:'#fff',SRH:'#fff',GT:'#fff',LSG:'#fff'};

window.renderSchedule=function(){
 var el=document.getElementById('scheduleBody'); if(!el) return;
 var html=''; var prevDate=''; var tradeWindowSet=new Set(TRADE_WINDOWS);
 IPL_SCHEDULE.forEach(function(m,i){
  if(tradeWindowSet.has(i)){
   var _wIdx=TRADE_WINDOWS.indexOf(i)+1;
   var _prevMatch=IPL_SCHEDULE[i-1]; var _nextMatch=IPL_SCHEDULE[i];
   html+='<div style="padding:14px 16px;margin:12px 0;background:var(--warn-bg);border:1px solid var(--warn-bdr);border-radius:var(--r);text-align:center;">'
    +'<div style="font-size:.92rem;font-weight:700;color:var(--warn);margin-bottom:4px;">CHANGE &amp; TRADE WINDOW '+_wIdx+'</div>'
    +'<div style="font-size:.78rem;color:var(--dim);">Between Match #'+(_prevMatch?_prevMatch.sr:'')+' ('+(_prevMatch?_prevMatch.date:'')+') and Match #'+(_nextMatch?_nextMatch.sr:'')+' ('+(_nextMatch?_nextMatch.date:'')+')</div>'
    +'<div style="font-size:.75rem;color:var(--dim2);margin-top:4px;">Teams may trade players and adjust squads during this window</div></div>';
  }
  if(m.date!==prevDate){ html+='<div style="font-size:.75rem;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;padding:12px 12px 4px;">'+m.date+' 2026</div>'; prevDate=m.date; }
  var bg1=TEAM_CLR[m.t1]||'var(--g2)',txt1=TEAM_TXT[m.t1]||'var(--txt)',bg2=TEAM_CLR[m.t2]||'var(--g2)',txt2=TEAM_TXT[m.t2]||'var(--txt)';
  html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--g1);border:1px solid var(--b0);border-radius:var(--r);margin-bottom:6px;">'
   +'<span style="font-size:.72rem;color:var(--dim);min-width:22px;text-align:center;">#'+m.sr+'</span>'
   +'<span style="font-size:.82rem;font-weight:700;min-width:48px;text-align:center;padding:3px 8px;border-radius:6px;background:'+bg1+';color:'+txt1+';">'+m.t1+'</span>'
   +'<span style="font-size:.72rem;color:var(--dim);">vs</span>'
   +'<span style="font-size:.82rem;font-weight:700;min-width:48px;text-align:center;padding:3px 8px;border-radius:6px;background:'+bg2+';color:'+txt2+';">'+m.t2+'</span>'
   +'<span style="flex:1;font-size:.78rem;color:var(--txt2);">'+m.city+'</span>'
   +'<span style="font-size:.78rem;font-weight:600;color:var(--accent);">'+m.time+' IST</span></div>';
 }); el.innerHTML=html;
};


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// TRADING MODULE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
var _tradeSendPlayers=[];
var _tradeReceivePlayers=[];

window.addTradePlayer=function(side){
 var selId = side==='send' ? 'tradeSendSelect' : 'tradeReceiveSelect';
 var listId = side==='send' ? 'tradeSendList' : 'tradeReceiveList';
 var arr = side==='send' ? _tradeSendPlayers : _tradeReceivePlayers;
 var sel = document.getElementById(selId);
 if(!sel||!sel.value) return;
 var name=sel.options[sel.selectedIndex].text;
 var val=sel.value;
 if(arr.some(function(p){return p.val===val;})) return window.showAlert('Player already added.');
 arr.push({val:val,name:name});
 window._renderTradeList(listId, arr, side);
 sel.selectedIndex=0;
};

window._renderTradeList=function(listId, arr, side){
 var el=document.getElementById(listId);
 if(!el) return;
 if(!arr.length){ el.innerHTML='<div style="font-size:.78rem;color:var(--dim);padding:4px;">No players selected</div>'; return; }
 el.innerHTML=arr.map(function(p,i){
  return '<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--g2);border-radius:6px;margin-bottom:4px;font-size:.82rem;">'
   +'<span style="flex:1;">'+p.name+'</span>'
   +'<button onclick="window._removeTradePlayer(\''+side+'\','+i+')" style="background:none;border:none;color:var(--err);cursor:pointer;font-size:.9rem;">x</button>'
   +'</div>';
 }).join('');
};

window._removeTradePlayer=function(side, idx){
 var arr = side==='send' ? _tradeSendPlayers : _tradeReceivePlayers;
 var listId = side==='send' ? 'tradeSendList' : 'tradeReceiveList';
 arr.splice(idx,1);
 window._renderTradeList(listId, arr, side);
};

window.clearTradeForm=function(){
 _tradeSendPlayers=[];
 _tradeReceivePlayers=[];
 window._renderTradeList('tradeSendList', [], 'send');
 window._renderTradeList('tradeReceiveList', [], 'receive');
 var s1=document.getElementById('tradeSendSelect'); if(s1) s1.selectedIndex=0;
 var s2=document.getElementById('tradeReceiveSelect'); if(s2) s2.selectedIndex=0;
 var s3=document.getElementById('tradePartnerSelect'); if(s3) s3.selectedIndex=0;
};

window.loadTradeDropdowns=function(){
 var state=roomState;
 if(!state||!state.teams) return;
 // Populate partner dropdown (all teams except mine)
 var partnerSel=document.getElementById('tradePartnerSelect');
 if(partnerSel){
  var html='<option value="">-- Select trade partner --</option>';
  Object.values(state.teams).forEach(function(t){
   if(t.name!==myTeamName) html+='<option value="'+t.name+'">'+t.name+'</option>';
  });
  partnerSel.innerHTML=html;
 }
 // Populate my players
 var sendSel=document.getElementById('tradeSendSelect');
 if(sendSel){
  var myTeam=state.teams[myTeamName];
  var roster=myTeam?(Array.isArray(myTeam.roster)?myTeam.roster:(myTeam.roster?Object.values(myTeam.roster):[])):[];
  var html2='<option value="">-- Select player to send --</option>';
  roster.forEach(function(p){
   var name=p.name||p.n||'';
   html2+='<option value="'+encodeURIComponent(name)+'">'+name+' ('+( p.iplTeam||p.t||'')+' | '+(p.role||p.r||'')+')</option>';
  });
  sendSel.innerHTML=html2;
 }
};

window.loadPartnerPlayers=function(){
 var state=roomState;
 var partnerName=document.getElementById('tradePartnerSelect')?.value;
 var recSel=document.getElementById('tradeReceiveSelect');
 if(!recSel||!partnerName||!state?.teams) return;
 var partner=state.teams[partnerName];
 var roster=partner?(Array.isArray(partner.roster)?partner.roster:(partner.roster?Object.values(partner.roster):[])):[];
 var html='<option value="">-- Select player to receive --</option>';
 roster.forEach(function(p){
  var name=p.name||p.n||'';
  html+='<option value="'+encodeURIComponent(name)+'">'+name+' ('+(p.iplTeam||p.t||'')+' | '+(p.role||p.r||'')+')</option>';
 });
 recSel.innerHTML=html;
};

window.proposeTrade=function(){
 if(!roomId||!myTeamName) return window.showAlert('Join a room first.');
 if(!_tradeSendPlayers.length) return window.showAlert('Select at least one player to send.');
 if(!_tradeReceivePlayers.length) return window.showAlert('Select at least one player to receive.');
 var partner=document.getElementById('tradePartnerSelect')?.value;
 if(!partner) return window.showAlert('Select a trade partner.');

 var trade={
  from:myTeamName,
  to:partner,
  sending:_tradeSendPlayers.map(function(p){return decodeURIComponent(p.val);}),
  receiving:_tradeReceivePlayers.map(function(p){return decodeURIComponent(p.val);}),
  status:'pending',
  proposedAt:Date.now(),
  proposedBy:(user&&user.uid)||''
 };

 push(ref(db,'auctions/'+roomId+'/trades'),trade).then(function(){
  window.showAlert('Trade proposed to '+partner+'! They need to accept.','ok');
  window.clearTradeForm();
 }).catch(function(e){ window.showAlert('Failed: '+e.message); });
};

window.acceptTrade=function(tradeId){
 if(!roomId) return;
 get(ref(db,'auctions/'+roomId)).then(function(snap){
  var data=snap.val();
  if(!data) return window.showAlert('Room data not found.');
  var trade=data.trades&&data.trades[tradeId];
  if(!trade||trade.status!=='pending') return window.showAlert('Trade no longer pending.');

  // Verify the accepting user owns the "to" team
  if(myTeamName!==trade.to) return window.showAlert('Only '+trade.to+' can accept this trade.');

  var fromTeam=data.teams[trade.from];
  var toTeam=data.teams[trade.to];
  if(!fromTeam||!toTeam) return window.showAlert('Team not found.');

  var fromRoster=Array.isArray(fromTeam.roster)?fromTeam.roster.slice():(fromTeam.roster?Object.values(fromTeam.roster):[]);
  var toRoster=Array.isArray(toTeam.roster)?toTeam.roster.slice():(toTeam.roster?Object.values(toTeam.roster):[]);

  // Move "sending" players: from -> to
  var sendingPlayers=[];
  trade.sending.forEach(function(name){
   var idx=fromRoster.findIndex(function(p){return(p.name||p.n||'')===name;});
   if(idx>=0){ sendingPlayers.push(fromRoster[idx]); fromRoster.splice(idx,1); }
  });

  // Move "receiving" players: to -> from
  var receivingPlayers=[];
  trade.receiving.forEach(function(name){
   var idx=toRoster.findIndex(function(p){return(p.name||p.n||'')===name;});
   if(idx>=0){ receivingPlayers.push(toRoster[idx]); toRoster.splice(idx,1); }
  });

  // Add to new teams
  sendingPlayers.forEach(function(p){ toRoster.push(p); });
  receivingPlayers.forEach(function(p){ fromRoster.push(p); });

  var upd={};
  upd['auctions/'+roomId+'/teams/'+trade.from+'/roster']=fromRoster;
  upd['auctions/'+roomId+'/teams/'+trade.to+'/roster']=toRoster;
  upd['auctions/'+roomId+'/trades/'+tradeId+'/status']='accepted';
  upd['auctions/'+roomId+'/trades/'+tradeId+'/completedAt']=Date.now();

  // Also update draftedBy/soldTo in the players array if it exists
  if(data.players){
   var allP=Array.isArray(data.players)?data.players:Object.values(data.players||{});
   trade.sending.forEach(function(name){
    var pIdx=allP.findIndex(function(p){return(p.name||p.n||'')===name;});
    if(pIdx>=0){
     upd['auctions/'+roomId+'/players/'+pIdx+'/draftedBy']=trade.to;
     upd['auctions/'+roomId+'/players/'+pIdx+'/soldTo']=trade.to;
    }
   });
   trade.receiving.forEach(function(name){
    var pIdx=allP.findIndex(function(p){return(p.name||p.n||'')===name;});
    if(pIdx>=0){
     upd['auctions/'+roomId+'/players/'+pIdx+'/draftedBy']=trade.from;
     upd['auctions/'+roomId+'/players/'+pIdx+'/soldTo']=trade.from;
    }
   });
  }

  // Invalidate squad caches for both teams
  upd['auctions/'+roomId+'/teams/'+trade.from+'/squadValid']=null;
  upd['auctions/'+roomId+'/teams/'+trade.to+'/squadValid']=null;

  update(ref(db),upd).then(function(){
   window.showAlert('Trade accepted! Rosters updated.','ok');
  }).catch(function(e){ window.showAlert('Trade failed: '+e.message); });
 });
};

window.rejectTrade=function(tradeId){
 if(!roomId) return;
 var upd={};
 upd['auctions/'+roomId+'/trades/'+tradeId+'/status']='rejected';
 upd['auctions/'+roomId+'/trades/'+tradeId+'/completedAt']=Date.now();
 update(ref(db),upd).then(function(){
  window.showAlert('Trade rejected.','ok');
 });
};

window.cancelTrade=function(tradeId){
 if(!roomId) return;
 var upd={};
 upd['auctions/'+roomId+'/trades/'+tradeId+'/status']='cancelled';
 update(ref(db),upd).then(function(){
  window.showAlert('Trade cancelled.','ok');
 });
};

window.renderTrades=function(data){
 if(!data) return;
 var trades=data.trades?Object.entries(data.trades):[];
 var pendingEl=document.getElementById('pendingTradesList');
 var historyEl=document.getElementById('tradeHistoryList');
 if(!pendingEl||!historyEl) return;

 var pending=trades.filter(function(e){return e[1].status==='pending';}).sort(function(a,b){return(b[1].proposedAt||0)-(a[1].proposedAt||0);});
 var history=trades.filter(function(e){return e[1].status!=='pending';}).sort(function(a,b){return(b[1].completedAt||b[1].proposedAt||0)-(a[1].completedAt||a[1].proposedAt||0);});

 if(!pending.length){ pendingEl.innerHTML='<div class="empty">No pending trades.</div>'; }
 else {
  pendingEl.innerHTML=pending.map(function(e){
   var tid=e[0], t=e[1];
   var isMine = t.from===myTeamName;
   var isForMe = t.to===myTeamName;
   var actions='';
   if(isForMe) actions='<button class="btn btn-sm" style="background:var(--ok-bg);color:var(--ok);border:1px solid var(--ok-bdr);" onclick="window.acceptTrade(\''+tid+'\')">Accept</button><button class="btn btn-ghost btn-sm" onclick="window.rejectTrade(\''+tid+'\')">Reject</button>';
   else if(isMine) actions='<button class="btn btn-ghost btn-sm" onclick="window.cancelTrade(\''+tid+'\')">Cancel</button>';
   else actions='<span style="font-size:.75rem;color:var(--dim);">Between other teams</span>';

   return '<div style="background:var(--g1);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:8px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
    +'<span style="font-weight:600;font-size:.85rem;color:var(--txt);">'+t.from+' &#8596; '+t.to+'</span>'
    +'<span style="font-size:.72rem;color:var(--dim);">'+new Date(t.proposedAt).toLocaleDateString()+'</span></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'
    +'<div><div style="font-size:.72rem;color:var(--dim);margin-bottom:4px;">'+t.from+' sends:</div>'
    +t.sending.map(function(n){return '<div style="font-size:.82rem;font-weight:500;color:var(--err);">- '+n+'</div>';}).join('')+'</div>'
    +'<div><div style="font-size:.72rem;color:var(--dim);margin-bottom:4px;">'+t.to+' sends:</div>'
    +t.receiving.map(function(n){return '<div style="font-size:.82rem;font-weight:500;color:var(--ok);">- '+n+'</div>';}).join('')+'</div></div>'
    +'<div style="display:flex;gap:8px;">'+actions+'</div></div>';
  }).join('');
 }

 if(!history.length){ historyEl.innerHTML='<div class="empty">No completed trades yet.</div>'; }
 else {
  historyEl.innerHTML=history.slice(0,20).map(function(e){
   var t=e[1];
   var statusCol = t.status==='accepted'?'var(--ok)':t.status==='rejected'?'var(--err)':'var(--dim)';
   var statusLabel = t.status==='accepted'?'Completed':t.status==='rejected'?'Rejected':'Cancelled';
   return '<div style="background:var(--g1);border:1px solid var(--b0);border-radius:var(--r);padding:10px;margin-bottom:6px;opacity:'+(t.status==='accepted'?'1':'.6')+';">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="font-size:.82rem;font-weight:500;">'+t.from+' &#8596; '+t.to+'</span>'
    +'<span style="font-size:.72rem;font-weight:600;color:'+statusCol+';">'+statusLabel+'</span></div>'
    +'<div style="font-size:.75rem;color:var(--dim);margin-top:4px;">Sent: '+t.sending.join(', ')+' | Received: '+t.receiving.join(', ')+'</div></div>';
  }).join('');
 }
};

window.toggleSquadLock_A=function(){
 if(!isAdmin||!roomId) return;
 var currentLock=roomState&&roomState.squadLocked;
 var upd={}; upd['auctions/'+roomId+'/squadLocked']=!currentLock;
 update(ref(db),upd).then(function(){ window.showAlert(!currentLock?'My Team changes LOCKED.':'My Team changes UNLOCKED.','ok'); }).catch(function(e){ window.showAlert('Failed: '+e.message); });
};

// ═══════════════════════════════════════════════════════════
// GROUPED NAVIGATION CONTROLLER
// ═══════════════════════════════════════════════════════════
(function(){
  const GROUPS = {
    auction: { tabs: ['setup','auction','trades'], labels: { setup:'Setup', auction:'Live Auction', trades:'Trade Center' } },
    squad:   { tabs: ['teams','roster','myteam'], labels: { teams:'Team Purses', roster:'Player Ledger', myteam:'My Squad' } },
    season:  { tabs: ['points','leaderboard','players-season','schedule'], labels: { points:'Points Table', leaderboard:'Leaderboard', 'players-season':'Player Stats', schedule:'Schedule' } },
    data:    { tabs: ['analytics','matches'], labels: { analytics:'Analytics', matches:'Match Data' } }
  };
  const GROUP_ORDER = ['auction','squad','season','data'];

  function getGroupForTab(tabId) {
    for (const g of GROUP_ORDER) {
      if (GROUPS[g].tabs.includes(tabId)) return g;
    }
    return null;
  }

  function renderSubTabs(groupId) {
    const bar = document.getElementById('subTabBar');
    if (!bar) return;
    const group = GROUPS[groupId];
    if (!group) { bar.innerHTML = ''; return; }
    
    bar.innerHTML = group.tabs.map(t => {
      const btn = document.getElementById('btn-' + t);
      const isActive = btn && btn.classList.contains('active');
      return `<button class="sub-tab${isActive ? ' active' : ''}" onclick="window.switchTab('${t}')">${group.labels[t] || t}</button>`;
    }).join('');
  }

  function highlightGroup(groupId) {
    GROUP_ORDER.forEach(g => {
      const el = document.getElementById('gnav-' + g);
      if (el) el.classList.toggle('active', g === groupId);
    });
  }

  // Wrap the original switchTab
  const _origSwitchTab = window.switchTab;
  window.switchTab = function(t) {
    _origSwitchTab(t);
    const g = getGroupForTab(t);
    if (g) {
      highlightGroup(g);
      renderSubTabs(g);
    }
  };

  // Group click handler — switches to first tab in group
  window.switchGroup = function(groupId) {
    const group = GROUPS[groupId];
    if (group && group.tabs.length) {
      window.switchTab(group.tabs[0]);
    }
  };

  // Initialize on load
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      // Find which tab is currently active
      const activeBtn = document.querySelector('.anav-btn.active');
      if (activeBtn) {
        const tabId = activeBtn.id.replace('btn-', '');
        const g = getGroupForTab(tabId);
        if (g) {
          highlightGroup(g);
          renderSubTabs(g);
        }
      }
    }, 500);
  });
})();
