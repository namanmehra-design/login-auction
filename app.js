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
function escapeHtml(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
let user=null,roomId=null,roomState=null,isAdmin=false,roomListener=null,isSignup=false;
let myTeamName='',pendingJoinRoomId='',roomToDelete='',roomToDeleteName='';
let releaseTeam='',releaseIdx=-1,releasePlayerName='',releasePrice=0;
let autoSellInProgress=false;
let cachedAllPlayers=null;

// -- Player data --
const rawData=[
{n:"Ruturaj Gaikwad",t:"CSK",r:"Batter",o:false},{n:"MS Dhoni",t:"CSK",r:"Wicketkeeper",o:false},{n:"Dewald Brevis* (SA)",t:"CSK",r:"Batter",o:true},{n:"Ayush Mhatre",t:"CSK",r:"Batter",o:false},{n:"Urvil Patel",t:"CSK",r:"Wicketkeeper",o:false},{n:"Anshul Kamboj",t:"CSK",r:"All-rounder",o:false},{n:"Jamie Overton* (ENG)",t:"CSK",r:"Bowler",o:true},{n:"Ramakrishna Ghosh",t:"CSK",r:"All-rounder",o:false},{n:"Shivam Dube",t:"CSK",r:"All-rounder",o:false},{n:"Khaleel Ahmed",t:"CSK",r:"Bowler",o:false},{n:"Noor Ahmad* (AFG)",t:"CSK",r:"Bowler",o:true},{n:"Mukesh Choudhary",t:"CSK",r:"Bowler",o:false},{n:"Nathan Ellis* (AUS)",t:"CSK",r:"Bowler",o:true},{n:"Shreyas Gopal",t:"CSK",r:"Bowler",o:false},{n:"Gurjapneet Singh",t:"CSK",r:"Bowler",o:false},{n:"Sanju Samson",t:"CSK",r:"Wicketkeeper",o:false},{n:"Akeal Hosein* (WI)",t:"CSK",r:"Bowler",o:true},{n:"Prashant Veer",t:"CSK",r:"All-rounder",o:false},{n:"Kartik Sharma",t:"CSK",r:"Wicketkeeper",o:false},{n:"Matthew Short* (AUS)",t:"CSK",r:"All-rounder",o:true},{n:"Aman Khan",t:"CSK",r:"All-rounder",o:false},{n:"Sarfaraz Khan",t:"CSK",r:"Batter",o:false},{n:"Rahul Chahar",t:"CSK",r:"Bowler",o:false},{n:"Matt Henry* (NZ)",t:"CSK",r:"Bowler",o:true},{n:"Zak Foulkes* (NZ)",t:"CSK",r:"All-rounder",o:true},{n:"Spencer Johnson* (AUS)",t:"CSK",r:"Bowler",o:true},
{n:"KL Rahul",t:"DC",r:"Wicketkeeper",o:false},{n:"Karun Nair",t:"DC",r:"Batter",o:false},{n:"Abishek Porel",t:"DC",r:"Wicketkeeper",o:false},{n:"Tristan Stubbs* (SA)",t:"DC",r:"Batter",o:true},{n:"Axar Patel",t:"DC",r:"All-rounder",o:false},{n:"Sameer Rizvi",t:"DC",r:"Batter",o:false},{n:"Ashutosh Sharma",t:"DC",r:"Batter",o:false},{n:"Vipraj Nigam",t:"DC",r:"All-rounder",o:false},{n:"Ajay Mandal",t:"DC",r:"All-rounder",o:false},{n:"Tripurana Vijay",t:"DC",r:"All-rounder",o:false},{n:"Madhav Tiwari",t:"DC",r:"All-rounder",o:false},{n:"Mitchell Starc* (AUS)",t:"DC",r:"Bowler",o:true},{n:"T. Natarajan",t:"DC",r:"Bowler",o:false},{n:"Mukesh Kumar",t:"DC",r:"Bowler",o:false},{n:"Dushmantha Chameera* (SL)",t:"DC",r:"Bowler",o:true},{n:"Kuldeep Yadav",t:"DC",r:"Bowler",o:false},{n:"Nitish Rana",t:"DC",r:"Batter",o:false},{n:"Auqib Dar",t:"DC",r:"All-rounder",o:false},{n:"Ben Duckett* (ENG)",t:"DC",r:"Wicketkeeper",o:true},{n:"David Miller* (SA)",t:"DC",r:"Batter",o:true},{n:"Pathum Nissanka* (SL)",t:"DC",r:"Batter",o:true},{n:"Lungi Ngidi* (SA)",t:"DC",r:"Bowler",o:true},{n:"Sahil Parakh",t:"DC",r:"Batter",o:false},{n:"Prithvi Shaw",t:"DC",r:"Batter",o:false},{n:"Kyle Jamieson* (NZ)",t:"DC",r:"Bowler",o:true},
{n:"Shubman Gill",t:"GT",r:"Batter",o:false},{n:"Sai Sudharsan",t:"GT",r:"Batter",o:false},{n:"Kumar Kushagra",t:"GT",r:"Wicketkeeper",o:false},{n:"Anuj Rawat",t:"GT",r:"Wicketkeeper",o:false},{n:"Jos Buttler* (ENG)",t:"GT",r:"Wicketkeeper",o:true},{n:"Nishant Sindhu",t:"GT",r:"All-rounder",o:false},{n:"Glenn Phillips* (NZ)",t:"GT",r:"All-rounder",o:true},{n:"Washington Sundar",t:"GT",r:"All-rounder",o:false},{n:"Arshad Khan",t:"GT",r:"Bowler",o:false},{n:"Shahrukh Khan",t:"GT",r:"Batter",o:false},{n:"Rahul Tewatia",t:"GT",r:"All-rounder",o:false},{n:"Kagiso Rabada* (SA)",t:"GT",r:"Bowler",o:true},{n:"Mohammed Siraj",t:"GT",r:"Bowler",o:false},{n:"Prasidh Krishna",t:"GT",r:"Bowler",o:false},{n:"Ishant Sharma",t:"GT",r:"Bowler",o:false},{n:"Gurnoor Singh Brar",t:"GT",r:"Bowler",o:false},{n:"Rashid Khan* (AFG)",t:"GT",r:"Bowler",o:true},{n:"Manav Suthar",t:"GT",r:"Bowler",o:false},{n:"Sai Kishore",t:"GT",r:"Bowler",o:false},{n:"Jayant Yadav",t:"GT",r:"Bowler",o:false},{n:"Ashok Sharma",t:"GT",r:"Bowler",o:false},{n:"Jason Holder* (WI)",t:"GT",r:"All-rounder",o:true},{n:"Tom Banton* (ENG)",t:"GT",r:"Batter",o:true},{n:"Luke Wood* (ENG)",t:"GT",r:"Bowler",o:true},{n:"Prithviraj Yarra",t:"GT",r:"Bowler",o:false},{n:"Kulwant Khejroliya",t:"GT",r:"Bowler",o:false},{n:"Connor Esterhuizen* (SA)",t:"GT",r:"Wicketkeeper",o:true},
{n:"Ajinkya Rahane",t:"KKR",r:"Batter",o:false},{n:"Rinku Singh",t:"KKR",r:"Batter",o:false},{n:"Angkrish Raghuvanshi",t:"KKR",r:"Batter",o:false},{n:"Manish Pandey",t:"KKR",r:"Batter",o:false},{n:"Rovman Powell* (WI)",t:"KKR",r:"All-rounder",o:true},{n:"Anukul Roy",t:"KKR",r:"All-rounder",o:false},{n:"Ramandeep Singh",t:"KKR",r:"Batter",o:false},{n:"Vaibhav Arora",t:"KKR",r:"Bowler",o:false},{n:"Sunil Narine* (WI)",t:"KKR",r:"All-rounder",o:true},{n:"Varun Chakaravarthy",t:"KKR",r:"Bowler",o:false},{n:"Harshit Rana",t:"KKR",r:"Bowler",o:false},{n:"Umran Malik",t:"KKR",r:"Bowler",o:false},{n:"Cameron Green* (AUS)",t:"KKR",r:"All-rounder",o:true},{n:"Matheesha Pathirana* (SL)",t:"KKR",r:"Bowler",o:true},{n:"Finn Allen* (NZ)",t:"KKR",r:"Wicketkeeper",o:true},{n:"Tejasvi Singh",t:"KKR",r:"Wicketkeeper",o:false},{n:"Prashant Solanki",t:"KKR",r:"Bowler",o:false},{n:"Kartik Tyagi",t:"KKR",r:"Bowler",o:false},{n:"Rahul Tripathi",t:"KKR",r:"Batter",o:false},{n:"Tim Seifert* (NZ)",t:"KKR",r:"Wicketkeeper",o:true},{n:"Sarthak Ranjan",t:"KKR",r:"All-rounder",o:false},{n:"Daksh Kamra",t:"KKR",r:"All-rounder",o:false},{n:"Akash Deep",t:"KKR",r:"Bowler",o:false},{n:"Rachin Ravindra* (NZ)",t:"KKR",r:"All-rounder",o:true},{n:"Blessing Muzarabani* (ZIM)",t:"KKR",r:"Bowler",o:true},{n:"Saurabh Dubey",t:"KKR",r:"Bowler",o:false},{n:"Navdeep Saini",t:"KKR",r:"Bowler",o:false},
{n:"Rishabh Pant",t:"LSG",r:"Wicketkeeper",o:false},{n:"Ayush Badoni",t:"LSG",r:"All-rounder",o:false},{n:"Abdul Samad",t:"LSG",r:"Batter",o:false},{n:"Aiden Markram* (SA)",t:"LSG",r:"Batter",o:true},{n:"Himmat Singh",t:"LSG",r:"Batter",o:false},{n:"Matthew Breetzke* (SA)",t:"LSG",r:"Batter",o:true},{n:"Nicholas Pooran* (WI)",t:"LSG",r:"Wicketkeeper",o:true},{n:"Mitchell Marsh* (AUS)",t:"LSG",r:"Batter",o:true},{n:"Shahbaz Ahamad",t:"LSG",r:"All-rounder",o:false},{n:"Arshin Kulkarni",t:"LSG",r:"All-rounder",o:false},{n:"Mayank Yadav",t:"LSG",r:"Bowler",o:false},{n:"Avesh Khan",t:"LSG",r:"Bowler",o:false},{n:"Mohsin Khan",t:"LSG",r:"Bowler",o:false},{n:"M. Siddharth",t:"LSG",r:"Bowler",o:false},{n:"Digvesh Rathi",t:"LSG",r:"Bowler",o:false},{n:"Prince Yadav",t:"LSG",r:"Bowler",o:false},{n:"Akash Singh",t:"LSG",r:"Bowler",o:false},{n:"Arjun Tendulkar",t:"LSG",r:"Bowler",o:false},{n:"Mohammed Shami",t:"LSG",r:"Bowler",o:false},{n:"Anrich Nortje* (SA)",t:"LSG",r:"Bowler",o:true},{n:"Wanindu Hasaranga* (SL)",t:"LSG",r:"All-rounder",o:true},{n:"Mukul Choudhary",t:"LSG",r:"Wicketkeeper",o:false},{n:"Naman Tiwari",t:"LSG",r:"All-rounder",o:false},{n:"Akshat Raghuwanshi",t:"LSG",r:"Batter",o:false},{n:"Josh Inglis* (AUS)",t:"LSG",r:"Batter",o:true},{n:"George Linde* (SA)",t:"LSG",r:"All-rounder",o:true},
{n:"Rohit Sharma",t:"MI",r:"Batter",o:false},{n:"Surya Kumar Yadav",t:"MI",r:"Batter",o:false},{n:"Robin Minz",t:"MI",r:"Wicketkeeper",o:false},{n:"Ryan Rickelton* (SA)",t:"MI",r:"Wicketkeeper",o:true},{n:"Tilak Varma",t:"MI",r:"Batter",o:false},{n:"Hardik Pandya",t:"MI",r:"All-rounder",o:false},{n:"Naman Dhir",t:"MI",r:"All-rounder",o:false},{n:"Mitchell Santner* (NZ)",t:"MI",r:"All-rounder",o:true},{n:"Will Jacks* (ENG)",t:"MI",r:"All-rounder",o:true},{n:"Corbin Bosch* (SA)",t:"MI",r:"All-rounder",o:true},{n:"Raj Bawa",t:"MI",r:"All-rounder",o:false},{n:"Trent Boult* (NZ)",t:"MI",r:"Bowler",o:true},{n:"Jasprit Bumrah",t:"MI",r:"Bowler",o:false},{n:"Deepak Chahar",t:"MI",r:"Bowler",o:false},{n:"Ashwani Kumar",t:"MI",r:"Bowler",o:false},{n:"Raghu Sharma",t:"MI",r:"Bowler",o:false},{n:"Allah Ghazanfar* (AFG)",t:"MI",r:"Bowler",o:true},{n:"Mayank Markande",t:"MI",r:"Bowler",o:false},{n:"Shardul Thakur",t:"MI",r:"All-rounder",o:false},{n:"Sherfane Rutherford* (WI)",t:"MI",r:"Batter",o:true},{n:"Quinton De Kock* (SA)",t:"MI",r:"Wicketkeeper",o:true},{n:"Atharva Ankolekar",t:"MI",r:"All-rounder",o:false},{n:"Mohammad Izhar",t:"MI",r:"Bowler",o:false},{n:"Danish Malewar",t:"MI",r:"Batter",o:false},{n:"Mayank Rawat",t:"MI",r:"All-rounder",o:false},{n:"Krish Bhagat",t:"MI",r:"Bowler",o:false},
{n:"Shreyas Iyer",t:"PBKS",r:"Batter",o:false},{n:"Nehal Wadhera",t:"PBKS",r:"Batter",o:false},{n:"Vishnu Vinod",t:"PBKS",r:"Wicketkeeper",o:false},{n:"Harnoor Pannu",t:"PBKS",r:"Batter",o:false},{n:"Pyla Avinash",t:"PBKS",r:"Batter",o:false},{n:"Prabhsimran Singh",t:"PBKS",r:"Wicketkeeper",o:false},{n:"Shashank Singh",t:"PBKS",r:"Batter",o:false},{n:"Marcus Stoinis* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Harpreet Brar",t:"PBKS",r:"All-rounder",o:false},{n:"Marco Jansen* (SA)",t:"PBKS",r:"All-rounder",o:true},{n:"Azmatullah Omarzai* (AFG)",t:"PBKS",r:"All-rounder",o:true},{n:"Priyansh Arya",t:"PBKS",r:"All-rounder",o:false},{n:"Musheer Khan",t:"PBKS",r:"All-rounder",o:false},{n:"Suryansh Shedge",t:"PBKS",r:"All-rounder",o:false},{n:"Mitch Owen* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Arshdeep Singh",t:"PBKS",r:"Bowler",o:false},{n:"Yuzvendra Chahal",t:"PBKS",r:"Bowler",o:false},{n:"Vyshak Vijaykumar",t:"PBKS",r:"Bowler",o:false},{n:"Yash Thakur",t:"PBKS",r:"Bowler",o:false},{n:"Xavier Bartlett* (AUS)",t:"PBKS",r:"Bowler",o:true},{n:"Lockie Ferguson* (NZ)",t:"PBKS",r:"Bowler",o:true},{n:"Cooper Connolly* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Ben Dwarshuis* (AUS)",t:"PBKS",r:"All-rounder",o:true},{n:"Vishal Nishad",t:"PBKS",r:"Bowler",o:false},{n:"Pravin Dubey",t:"PBKS",r:"Bowler",o:false},
{n:"Shubham Dubey",t:"RR",r:"Batter",o:false},{n:"Vaibhav Suryavanshi",t:"RR",r:"Batter",o:false},{n:"Lhuan-dre Pretorius* (SA)",t:"RR",r:"Batter",o:true},{n:"Shimron Hetmyer* (WI)",t:"RR",r:"Batter",o:true},{n:"Yashasvi Jaiswal",t:"RR",r:"Batter",o:false},{n:"Dhruv Jurel",t:"RR",r:"Wicketkeeper",o:false},{n:"Riyan Parag",t:"RR",r:"Batter",o:false},{n:"Yudhvir Singh Charak",t:"RR",r:"All-rounder",o:false},{n:"Jofra Archer* (ENG)",t:"RR",r:"Bowler",o:true},{n:"Tushar Deshpande",t:"RR",r:"Bowler",o:false},{n:"Sandeep Sharma",t:"RR",r:"Bowler",o:false},{n:"Kwena Maphaka* (SA)",t:"RR",r:"Bowler",o:true},{n:"Nandre Burger* (SA)",t:"RR",r:"Bowler",o:true},{n:"Ravindra Jadeja",t:"RR",r:"All-rounder",o:false},{n:"Sam Curran* (ENG)",t:"RR",r:"All-rounder",o:true},{n:"Donovan Ferreira* (SA)",t:"RR",r:"Wicketkeeper",o:true},{n:"Ravi Bishnoi",t:"RR",r:"Bowler",o:false},{n:"Sushant Mishra",t:"RR",r:"Bowler",o:false},{n:"Vignesh Puthur",t:"RR",r:"Bowler",o:false},{n:"Yash Raj Punja",t:"RR",r:"Bowler",o:false},{n:"Ravi Singh",t:"RR",r:"Wicketkeeper",o:false},{n:"Brijesh Sharma",t:"RR",r:"Bowler",o:false},{n:"Aman Rao",t:"RR",r:"Batter",o:false},{n:"Adam Milne* (NZ)",t:"RR",r:"Bowler",o:true},{n:"Kuldeep Sen",t:"RR",r:"Bowler",o:false},{n:"Dasun Shanaka* (SL)",t:"RR",r:"All-rounder",o:true},
{n:"Rajat Patidar",t:"RCB",r:"Batter",o:false},{n:"Virat Kohli",t:"RCB",r:"Batter",o:false},{n:"Tim David* (AUS)",t:"RCB",r:"All-rounder",o:true},{n:"Devdutt Padikkal",t:"RCB",r:"Batter",o:false},{n:"Phil Salt* (ENG)",t:"RCB",r:"Wicketkeeper",o:true},{n:"Jitesh Sharma",t:"RCB",r:"Wicketkeeper",o:false},{n:"Krunal Pandya",t:"RCB",r:"All-rounder",o:false},{n:"Jacob Bethell* (ENG)",t:"RCB",r:"All-rounder",o:true},{n:"Romario Shepherd* (WI)",t:"RCB",r:"All-rounder",o:true},{n:"Swapnil Singh",t:"RCB",r:"All-rounder",o:false},{n:"Josh Hazlewood* (AUS)",t:"RCB",r:"Bowler",o:true},{n:"Bhuvneshwar Kumar",t:"RCB",r:"Bowler",o:false},{n:"Rasikh Salam",t:"RCB",r:"Bowler",o:false},{n:"Yash Dayal",t:"RCB",r:"Bowler",o:false},{n:"Suyash Sharma",t:"RCB",r:"Bowler",o:false},{n:"Nuwan Thushara* (SL)",t:"RCB",r:"Bowler",o:true},{n:"Abhinandan Singh",t:"RCB",r:"Bowler",o:false},{n:"Venkatesh Iyer",t:"RCB",r:"All-rounder",o:false},{n:"Jacob Duffy* (NZ)",t:"RCB",r:"Bowler",o:true},{n:"Mangesh Yadav",t:"RCB",r:"All-rounder",o:false},{n:"Satvik Deswal",t:"RCB",r:"All-rounder",o:false},{n:"Jordan Cox* (ENG)",t:"RCB",r:"Batter",o:true},{n:"Kanishk Chouhan",t:"RCB",r:"All-rounder",o:false},{n:"Vihaan Malhotra",t:"RCB",r:"All-rounder",o:false},{n:"Vicky Ostwal",t:"RCB",r:"All-rounder",o:false},
{n:"Travis Head* (AUS)",t:"SRH",r:"Batter",o:true},{n:"Abhishek Sharma",t:"SRH",r:"All-rounder",o:false},{n:"Aniket Verma",t:"SRH",r:"Batter",o:false},{n:"R Smaran",t:"SRH",r:"Batter",o:false},{n:"Ishan Kishan",t:"SRH",r:"Wicketkeeper",o:false},{n:"Heinrich Klaasen* (SA)",t:"SRH",r:"Wicketkeeper",o:true},{n:"Nitish Kumar Reddy",t:"SRH",r:"All-rounder",o:false},{n:"Harsh Dubey",t:"SRH",r:"All-rounder",o:false},{n:"Kamindu Mendis* (SL)",t:"SRH",r:"All-rounder",o:true},{n:"Harshal Patel",t:"SRH",r:"All-rounder",o:false},{n:"Brydon Carse* (ENG)",t:"SRH",r:"All-rounder",o:true},{n:"Pat Cummins* (AUS)",t:"SRH",r:"Bowler",o:true},{n:"Jaydev Unadkat",t:"SRH",r:"Bowler",o:false},{n:"Eshan Malinga* (SL)",t:"SRH",r:"Bowler",o:true},{n:"Zeeshan Ansari",t:"SRH",r:"Bowler",o:false},{n:"Shivang Kumar",t:"SRH",r:"All-rounder",o:false},{n:"Salil Arora",t:"SRH",r:"Wicketkeeper",o:false},{n:"Krains Fuletra",t:"SRH",r:"Bowler",o:false},{n:"Praful Hinge",t:"SRH",r:"Bowler",o:false},{n:"Amit Kumar",t:"SRH",r:"Bowler",o:false},{n:"Onkar Tarmale",t:"SRH",r:"Bowler",o:false},{n:"Sakib Hussain",t:"SRH",r:"Bowler",o:false},{n:"Liam Livingstone* (ENG)",t:"SRH",r:"All-rounder",o:true},{n:"Shivam Mavi",t:"SRH",r:"Bowler",o:false},{n:"Jack Edwards* (AUS)",t:"SRH",r:"All-rounder",o:true},{n:"David Payne* (ENG)",t:"SRH",r:"Bowler",o:true},{n:"Dilshan Madushanka* (SL)",t:"SRH",r:"Bowler",o:true},{n:"Gerald Coetzee* (SA)",t:"SRH",r:"Bowler",o:true}
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
const O=p=>!!(p.isOverseas||p.o||((p.name||p.n||'').indexOf('* (')>=0));

// -- Role SVG Icons (inline, currentColor, 24x24 viewBox) --
const ROLE_SVGS={
  batter:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2L7 14l2.5 1L17 3z"/><path d="M9 14.5L7 21"/><path d="M8.2 16.8l1.8.7"/><path d="M7.7 18.5l1.8.7"/></svg>`,
  bowler:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M8.5 4.5C6.5 7.5 6.5 16.5 8.5 19.5"/><path d="M15.5 4.5C17.5 7.5 17.5 16.5 15.5 19.5"/><line x1="7.5" y1="7.5" x2="6.8" y2="6.8"/><line x1="7" y1="9.5" x2="6.2" y2="9.3"/><line x1="6.8" y1="12" x2="6" y2="12"/><line x1="7" y1="14.5" x2="6.2" y2="14.7"/><line x1="7.5" y1="16.5" x2="6.8" y2="17.2"/><line x1="16.5" y1="7.5" x2="17.2" y2="6.8"/><line x1="17" y1="9.5" x2="17.8" y2="9.3"/><line x1="17.2" y1="12" x2="18" y2="12"/><line x1="17" y1="14.5" x2="17.8" y2="14.7"/><line x1="16.5" y1="16.5" x2="17.2" y2="17.2"/></svg>`,
  wicketkeeper:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 11V8a6 6 0 0 1 12 0v3"/><path d="M4 11c0 5 3.5 8.5 8 10c4.5-1.5 8-5 8-10H4z"/><path d="M9 14.5l1.5 1.5L12 14.5l1.5 1.5L15 14.5"/><circle cx="9" cy="11.5" r="0.5" fill="currentColor" stroke="none"/><circle cx="15" cy="11.5" r="0.5" fill="currentColor" stroke="none"/></svg>`,
  allrounder:`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3.5L2.5 11l2 .8L6 4.5z"/><path d="M3.8 11.5L3 16"/><circle cx="15" cy="9" r="5.5"/><path d="M12.5 5.5c-1 1.5-1 5.5 0 7"/><path d="M17.5 5.5c1 1.5 1 5.5 0 7"/><line x1="11.5" y1="7" x2="10.8" y2="6.5"/><line x1="11.2" y1="9" x2="10.5" y2="9"/><line x1="11.5" y1="11" x2="10.8" y2="11.5"/><line x1="18.5" y1="7" x2="19.2" y2="6.5"/><line x1="18.8" y1="9" x2="19.5" y2="9"/><line x1="18.5" y1="11" x2="19.2" y2="11.5"/><path d="M7 18l4 3.5L15 18l-4-2z" stroke-width="1.5"/></svg>`
};
function roleIcon(role,size){
  const s=size||16;
  const r=(role||'').toLowerCase().replace(/[^a-z]/g,'');
  let key='batter';
  if(r.includes('bowl'))key='bowler';
  else if(r.includes('wicket')||r.includes('keeper'))key='wicketkeeper';
  else if(r.includes('all'))key='allrounder';
  return ROLE_SVGS[key].replace(/width="\d+"/g,`width="${s}"`).replace(/height="\d+"/g,`height="${s}"`);
}

// -- Team Color Shift --
const IPL_TEAM_COLORS = {
  CSK:'#FAED24', MI:'#00528A', KKR:'#602F92', RCB:'#D5282D',
  PBKS:'#D52027', GT:'#1B2A4A', RR:'#ED1164', SRH:'#F04F23',
  LSG:'#AB1D3F', DC:'#243D88'
};

function setTeamColorWash(iplTeam) {
  const wash = document.getElementById('auroraTeamWash');
  if (!wash) return;
  const color = iplTeam ? (IPL_TEAM_COLORS[iplTeam.toUpperCase()] || IPL_TEAM_COLORS[iplTeam]) : null;
  if (color) {
    wash.style.setProperty('--team-color', color);
    wash.classList.add('active');
    const bidAmt = document.getElementById('liveBidText');
    if (bidAmt) { bidAmt.style.color = color; }
  } else {
    wash.classList.remove('active');
  }
}

function clearTeamColorWash() {
  const wash = document.getElementById('auroraTeamWash');
  if (wash) wash.classList.remove('active');
  const bidAmt = document.getElementById('liveBidText');
  if (bidAmt) bidAmt.style.color = '';
}

// -- One-time migration: fix overseas flags in roster data --
let _overseasMigrationDone={};
function migrateOverseasFlags(rid,data){
 if(_overseasMigrationDone[rid]) return;
 _overseasMigrationDone[rid]=true;
 if(!data?.teams) return;
 const upd={};
 let needsWrite=false;
 Object.entries(data.teams).forEach(([tname,team])=>{
  const roster=Array.isArray(team.roster)?team.roster:(team.roster?Object.values(team.roster):[]);
  roster.forEach((p,i)=>{
   const name=p.name||p.n||'';
   const shouldBeOverseas=name.indexOf('* (')>=0;
   if(shouldBeOverseas&&!p.isOverseas&&!p.o){
    upd[`auctions/${rid}/teams/${tname}/roster/${i}/isOverseas`]=true;
    needsWrite=true;
   }
  });
 });
 // Also fix players list
 if(data.players){
  const pArr=Array.isArray(data.players)?data.players:Object.values(data.players);
  pArr.forEach((p,i)=>{
   const name=p.name||p.n||'';
   if(name.indexOf('* (')>=0&&!p.isOverseas){
    upd[`auctions/${rid}/players/${i}/isOverseas`]=true;
    needsWrite=true;
   }
  });
 }
 if(needsWrite) update(ref(db),upd).catch(e=>console.warn('Overseas migration:',e));
}

// -- One-time migration: backfill missing squad snapshots for historical matches --
let _snapshotMigrationDone={};
function migrateSquadSnapshots(rid,data){
 if(_snapshotMigrationDone[rid]) return;
 _snapshotMigrationDone[rid]=true;
 if(!data?.matches||!data?.teams) return;
 const mp=data.maxPlayers||data.setup?.maxPlayers||20;
 const snaps=buildSquadSnapshots(data.teams,mp);
 if(!Object.keys(snaps).length) return;
 const upd={};
 let needsWrite=false;
 Object.entries(data.matches).forEach(([mid,m])=>{
  if(!m.squadSnapshots||!Object.keys(m.squadSnapshots).length){
   upd[`auctions/${rid}/matches/${mid}/squadSnapshots`]=snaps;
   needsWrite=true;
  }
 });
 if(needsWrite) update(ref(db),upd).then(()=>console.log('Backfilled squad snapshots for',rid)).catch(e=>console.warn('Snapshot migration:',e));
}

// -- One-time migration: fix duck points retroactively --
let _duckMigrationDone={};
function migrateDuckPoints(rid,data){
 if(_duckMigrationDone[rid]) return;
 _duckMigrationDone[rid]=true;
 if(!data?.matches) return;
 const upd={};
 let needsWrite=false;
 Object.entries(data.matches).forEach(([mid,m])=>{
  if(!m.players) return;
  Object.entries(m.players).forEach(([pkey,p])=>{
   const bd=(p.breakdown||'').toLowerCase();
   // Find players with 0 runs who didn't get duck penalty yet (case-insensitive check)
   if(bd.indexOf('bat(0r')>=0&&bd.indexOf('duck')<0){
    const pName=(p.name||'').toLowerCase().trim();
    const pClean=pName.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    let role='';
    if(data.players){
     const pArr=Array.isArray(data.players)?data.players:Object.values(data.players);
     const found=pArr.find(x=>{const xn=(x.name||x.n||'').toLowerCase().trim();return xn===pName||xn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===pClean;});
     if(found) role=(found.role||found.r||'').toLowerCase();
    }
    if(!role){const rd=rawData.find(x=>{const xn=(x.n||'').toLowerCase().trim();return xn===pName||xn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===pClean;});if(rd)role=(rd.r||'').toLowerCase();}
    if(role&&role!=='bowler'){
     upd[`auctions/${rid}/matches/${mid}/players/${pkey}/pts`]=(p.pts||0)-5;
     upd[`auctions/${rid}/matches/${mid}/players/${pkey}/breakdown`]=(p.breakdown||'')+' | DUCK: -5';
     needsWrite=true;
    }
   }
  });
 });
 // Also repair any players where duck was applied multiple times (the 3x bug)
 Object.entries(data.matches).forEach(([mid,m])=>{
  if(!m.players) return;
  Object.entries(m.players).forEach(([pkey,p])=>{
   const bd=p.breakdown||'';
   // Count how many times "Duck" or "DUCK" appears
   const duckMatches=(bd.match(/[Dd]uck:\s*-5/g)||[]).length;
   if(duckMatches>1){
    // Remove all duck penalties and re-apply exactly once
    const extraPenalties=(duckMatches-1)*5; // restore over-deducted points
    const cleanBd=bd.replace(/\s*\|\s*[Dd]uck:\s*-5/g,'')+ ' | DUCK: -5';
    upd[`auctions/${rid}/matches/${mid}/players/${pkey}/pts`]=(p.pts||0)+extraPenalties;
    upd[`auctions/${rid}/matches/${mid}/players/${pkey}/breakdown`]=cleanBd;
    needsWrite=true;
   }
  });
 });
 if(needsWrite) update(ref(db),upd).then(()=>{console.log('Duck points corrected for',rid);window.showAlert('Duck penalties corrected.','ok');}).catch(e=>console.warn('Duck migration:',e));
}

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
 const _tbu=document.getElementById('topbarUser'); if(_tbu) _tbu.textContent=user?.email||'';
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
 window.user=u; // expose for cd-app.js bridge
 const params=new URLSearchParams(window.location.search);
 const rp=params.get('room'),dp=params.get('draft');
 if(u){
 showApp();
 setTimeout(()=>{ const s=document.getElementById('dt-superadmin'); if(s) s.style.display=isSuperAdminEmail(u.email)?'block':'none'; },200);
 if(rp)loadRoom(rp);else if(dp)loadDraftRoom(dp);else loadDash();
 }
 else { window.roomId=null; window.roomState=null; window.myTeamName=''; window.isAdmin=false; showAuth(); }
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
 // Clean up all listeners
 if(roomListener){roomListener();roomListener=null;}
 if(window._auctionRenderTimer){clearTimeout(window._auctionRenderTimer);window._auctionRenderTimer=null;}
 // Clear all global state to prevent stale data leaking to next session
 roomState=null; myTeamName=''; isAdmin=false; user=null;
 window._dasunFixDoneA=false;
 signOut(auth).then(()=>{
  // Full page reload ensures clean slate — no stale listeners or variables
  window.location.href=window.location.pathname;
 });
};

// -- Dashboard --
function rcHTML(key,room,isOwner){
 const deleteBtn=isOwner?`<button class="btn btn-danger btn-sm" onclick="window.openDeleteModal('${escapeHtml(key)}','${escapeHtml((room.name||'Room').replace(/'/g,"\\'"))}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete</button>`:'';
 const leaveBtn=!isOwner?`<button class="btn btn-danger btn-sm" onclick="window.leaveAuctionRoom('${escapeHtml(key)}','${escapeHtml((room.name||'Room').replace(/'/g,"\\'"))}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Leave</button>`:'';
 return`<div class="rc"><div class="rc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L8 8l4 4-4 6h8l-4-6 4-4-4-6z"/><line x1="7" y1="22" x2="17" y2="22"/></svg></div><div class="rc-info"><div class="rc-name">${escapeHtml(room.name||'Auction Room')}</div><div class="rc-meta">\u20b9${room.budget||'--'} Cr &nbsp;.&nbsp; <span class="badge ${isOwner?'bg':'bb'}">${isOwner?'Admin':'Member'}</span></div></div><div class="rc-actions">${deleteBtn}${leaveBtn}
 <button class="btn btn-outline btn-sm" onclick="window.location.search='?room=${escapeHtml(key)}'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>Enter</button></div></div>`;
}

function loadDash(){
 showInner('dashboard-view');
 roomId=null;myTeamName='';
 if(roomListener){roomListener();roomListener=null;}
 // Show all dashboard sections at once (scroll layout, no tab switching)
 ['scorecards','created','joined'].forEach(t=>{
   const el=document.getElementById(`tab-${t}`);
   if(el) el.style.display='block';
 });
 renderGlobalScorecardHistory();
 // Super admin section
 const _saTab=document.getElementById('dt-superadmin');
 if(_saTab) _saTab.style.display=isSuperAdminEmail(user?.email)?'block':'none';
 const _saSection=document.getElementById('tab-superadmin');
 if(_saSection) _saSection.style.display=isSuperAdminEmail(user?.email)?'block':'none';
 if(isSuperAdminEmail(user?.email)) renderSuperAdminPanel();
 // Unsubscribe previous dashboard listeners to prevent memory leak / lag
 if(window._dashListenerA1){window._dashListenerA1();window._dashListenerA1=null;}
 if(window._dashListenerA2){window._dashListenerA2();window._dashListenerA2=null;}
 window._dashListenerA1=onValue(ref(db,`users/${user.uid}/auctions`),snap=>{
 const rooms=snap.val(),c=document.getElementById('roomListContainer');
 // Expose to window for cd-app.js bridge
 window.userAuctionRooms = rooms ? Object.entries(rooms).map(([k,r])=>({id:k,name:r.name||'Auction Room',budget:r.budget,maxTeams:r.maxTeams,maxPlayers:r.maxPlayers,createdAt:r.createdAt,isOwner:true})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)) : [];
 window.dispatchEvent(new CustomEvent('cd-rooms-update'));
 if(!c) return;
 if(!rooms){c.innerHTML='<div class="empty">No rooms yet -- create one above.</div>';return;}
 const _entries=Object.entries(rooms).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
 c.innerHTML=_entries.map(([k,r])=>rcHTML(k,r,true)).join('');
 });
 window._dashListenerA2=onValue(ref(db,`users/${user.uid}/joined`),snap=>{
 const rooms=snap.val(),c=document.getElementById('joinedRoomListContainer');
 // Expose to window for cd-app.js bridge
 window.userJoinedRooms = rooms ? Object.entries(rooms).map(([k,r])=>({id:k,name:r.name||'Auction Room',budget:r.budget,joinedAt:r.joinedAt,isOwner:false})).sort((a,b)=>(b.joinedAt||0)-(a.joinedAt||0)) : [];
 window.dispatchEvent(new CustomEvent('cd-rooms-update'));
 if(!c) return;
 if(!rooms){c.innerHTML='<div class="empty">No joined rooms yet.</div>';return;}
 const _entries=Object.entries(rooms).sort((a,b)=>(b[1].joinedAt||0)-(a[1].joinedAt||0));
 c.innerHTML=_entries.map(([k,r])=>rcHTML(k,r,false)).join('');
 });

 // DEEP SCAN: Find rooms where the user is a member but NOT in their /users path (data sync issue)
 // Self-heals by adding to /users/{uid}/joined so they show up next time
 setTimeout(async () => {
   try {
     const uid = user?.uid; if(!uid) return;
     const allSnap = await get(ref(db, 'auctions'));
     const all = allSnap.val() || {};
     const myKnownRooms = new Set();
     // Collect rooms already in user's /users path
     try {
       const ownedSnap = await get(ref(db, `users/${uid}/auctions`));
       Object.keys(ownedSnap.val() || {}).forEach(k => myKnownRooms.add(k));
       const joinedSnap = await get(ref(db, `users/${uid}/joined`));
       Object.keys(joinedSnap.val() || {}).forEach(k => myKnownRooms.add(k));
     } catch(e){}
     // Scan all rooms for membership
     const recoveredRooms = [];
     const heal = {};
     Object.entries(all).forEach(([rid, room]) => {
       if(!room || typeof room !== 'object') return;
       const isMember = room.members && room.members[uid];
       const isAdmin = room.adminUid === uid;
       if((isMember || isAdmin) && !myKnownRooms.has(rid)) {
         // Self-heal: add to user's path
         const target = isAdmin ? `users/${uid}/auctions/${rid}` : `users/${uid}/joined/${rid}`;
         heal[target] = {
           name: room.roomName || room.setup?.name || 'Auction Room',
           budget: room.budget || room.setup?.budget || 100,
           maxTeams: room.maxTeams || room.setup?.maxTeams || 7,
           maxPlayers: room.maxPlayers || room.setup?.maxPlayers || 21,
           maxOverseas: room.maxOverseas || room.setup?.maxOverseas || 8,
           [isAdmin ? 'createdAt' : 'joinedAt']: Date.now()
         };
         recoveredRooms.push({ rid, name: room.roomName || 'Room' });
       }
     });
     if(Object.keys(heal).length > 0) {
       await update(ref(db), heal);
       console.log('[CD recovery] Healed', recoveredRooms.length, 'rooms:', recoveredRooms.map(r=>r.name).join(', '));
     }
   } catch(e){ console.error('Deep scan failed:', e); }
 }, 1500);
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
 const maxOverseas=Math.min(8,Math.max(4,parseInt(document.getElementById('newRoomMaxOverseas')?.value)||8));
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
 window.myTeamName=myTeamName; // expose for cd-app.js bridge
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
 window.myTeamName=tn; // expose for cd-app.js bridge
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
 // Super admin release lock check
 if(roomState&&roomState.releaseLocked&&!isSuperAdminEmail(user?.email)){
  return window.showAlert('Player releases are locked by the super admin. Contact the super admin to unlock.','error');
 }
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
 // Re-check super admin release lock (in case it was toggled after modal opened)
 if(roomState&&roomState.releaseLocked&&!isSuperAdminEmail(user?.email)){
  window.closeReleaseModal();
  return window.showAlert('Player releases are locked by the super admin.','error');
 }
 const pricePaid=parseFloat(releasePrice)||0;
 const targetName=releasePlayerName.toLowerCase().trim();

 // Always re-fetch live data from Firebase -- never use stale roomState
 get(ref(db,`auctions/${roomId}`)).then(snap=>{
 const data=snap.val();
 if(!data)return window.showAlert('Room data not found. Please reload.');
 // Final lock check from fresh data
 if(data.releaseLocked&&!isSuperAdminEmail(user?.email)){
  window.closeReleaseModal();
  return window.showAlert('Player releases are locked by the super admin.','error');
 }

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
 window.setSidebarMode&&window.setSidebarMode('dash');
 loadDash();
};

window.copyInviteLink=function(){
 const url=`${location.origin}${location.pathname}?room=${roomId}`;
 navigator.clipboard.writeText(url).then(()=>window.showAlert('Invite link copied!','ok')).catch(()=>window.showAlert('Copy failed -- share this link manually: '+url,'info'));
};

// -- Auction Room --
function loadRoom(rid){
 showInner('auction-view');
 window.setSidebarMode&&window.setSidebarMode('room');
 roomId=rid; isAdmin=false; myTeamName='';
 window.roomId=rid; window.isAdmin=false; window.myTeamName=''; // expose for cd-app.js bridge

 // Resolve admin status and team name
 Promise.all([
 get(ref(db,`users/${user.uid}/auctions/${rid}`)),
 get(ref(db,`auctions/${rid}/members/${user.uid}`))
 ]).then(([adminSnap,memberSnap])=>{
 isAdmin=adminSnap.exists();
 window.isAdmin=isAdmin; // expose

 if(memberSnap.exists()){
 myTeamName=memberSnap.val().teamName||'';
 window.myTeamName=myTeamName; // expose
 }

 document.getElementById('roomRoleBadge').textContent=isAdmin?' Admin':' '+(myTeamName||'Member');
 document.getElementById('roomRoleBadge').className=`badge ${isAdmin?'bg':'bb'}`;
 var _lbA=document.getElementById('mt_lock_btn_A'); if(_lbA&&isAdmin){ _lbA.style.display='inline-block'; if(roomState){ _lbA.textContent=roomState.squadLocked?'Unlock Changes':'Lock Changes'; _lbA.style.background=roomState.squadLocked?'var(--err-bg)':'var(--surface)'; _lbA.style.color=roomState.squadLocked?'var(--err)':'var(--txt2)'; } }

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
 if(cfgBox) cfgBox.innerHTML=`<div class="setup-stat-grid"><div class="setup-stat"><div class="setup-stat-val">${rn}</div><div class="setup-stat-lbl">Room Name</div></div><div class="setup-stat"><div class="setup-stat-val setup-stat-val--accent">\u20b9${bg}</div><div class="setup-stat-lbl">Budget / Team (Cr)</div></div><div class="setup-stat"><div class="setup-stat-val">${mt}</div><div class="setup-stat-lbl">Max Teams</div></div><div class="setup-stat"><div class="setup-stat-val">${mp}</div><div class="setup-stat-lbl">Players / Team</div></div></div>`;+
 `Budget: <strong class="text-accent">\u20b9${bg} Cr/team</strong>&nbsp;.&nbsp; `+
 `Max Teams: <strong class="text-accent">${mt}</strong>&nbsp;.&nbsp; `+
 `Max Players/Team: <strong class="text-accent">${mp}</strong>`;
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
 window.roomState=data; // expose for cd-app.js bridge
 migrateOverseasFlags(rid,data);
 migrateSquadSnapshots(rid,data);
 migrateDuckPoints(rid,data);
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
 if(cfgBox) cfgBox.innerHTML=`<div class="setup-stat-grid"><div class="setup-stat"><div class="setup-stat-val">${roomName}</div><div class="setup-stat-lbl">Room Name</div></div><div class="setup-stat"><div class="setup-stat-val setup-stat-val--accent">\u20b9${budget}</div><div class="setup-stat-lbl">Budget / Team (Cr)</div></div><div class="setup-stat"><div class="setup-stat-val">${maxTeams}</div><div class="setup-stat-lbl">Max Teams</div></div><div class="setup-stat"><div class="setup-stat-val">${maxPlayers}</div><div class="setup-stat-lbl">Players / Team</div></div><div class="setup-stat"><div class="setup-stat-val">${maxOverseas||8}</div><div class="setup-stat-lbl">Max Overseas</div></div></div>`;+
 `Budget: <strong class="text-accent">\u20b9${budget} Cr/team</strong>&nbsp;.&nbsp; `+
 `Max Teams: <strong class="text-accent">${maxTeams}</strong>&nbsp;.&nbsp; `+
 `Max Players/Team: <strong class="text-accent">${maxPlayers}</strong>`;

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
   <div class="member-team-name">${escapeHtml(m.teamName||'')}${isMe?'<span class="member-you-badge">You</span>':''}</div>
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
<div class="tcard-hdr-top"><div class="tname">${escapeHtml(team.name)}</div></div>
<div class="tcard-pills">
 <div class="tpill purse-left"><div class="tpill-val">\u20b9${team.budget.toFixed(1)}</div><div class="tpill-lbl">Purse Left</div></div>
 <div class="tpill purse-spent"><div class="tpill-val">\u20b9${(roster.reduce((s,p)=>s+(p.soldPrice||0),0)).toFixed(1)}</div><div class="tpill-lbl">Spent</div></div>
 <div class="tpill purse-players"><div class="tpill-val">${roster.length}</div><div class="tpill-lbl">Sold</div></div>
 <div class="tpill purse-remaining"><div class="tpill-val">${(data.setup?.maxPlayers||20)-roster.length}</div><div class="tpill-lbl">Slots Left</div></div>
</div></div>${roster.length
 ?`<ul class="troster">${roster.map((p,pi)=>`<li><div class="troster-info"><div class="troster-name">${escapeHtml(p.name||p.n||'--')}<span class="iplteam-pill">${escapeHtml(p.iplTeam||p.t||'')}</span></div><div class="rrole">${escapeHtml(p.role||p.r||'')} . \u20b9${(p.soldPrice||0).toFixed(2)} Cr</div></div><button class="rel-btn" onclick="window.openReleaseModal('${escapeHtml(team.name)}',${pi},'${escapeHtml((p.name||p.n||'').replace(/'/g,"\'"))}',${p.soldPrice||0})"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Release</button></li>`).join('')}</ul>`
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

 // One-time auto-fix: add Dasun Shanaka if missing (only runs once per session)
 if(data.players&&roomId&&!window._dasunFixDoneA){
  var _ap=Array.isArray(data.players)?data.players:Object.values(data.players||{});
  if(!_ap.some(function(p){return(p.name||p.n||'').indexOf('Dasun Shanaka')>=0;})){
   _ap.push({name:"Dasun Shanaka* (SL)",n:"Dasun Shanaka* (SL)",iplTeam:"RR",t:"RR",role:"All-rounder",r:"All-rounder",isOverseas:true,o:true,status:"unsold",basePrice:2});
   data.players=_ap;
   set(ref(db,'auctions/'+roomId+'/players'),_ap).catch(function(){});
  }
  window._dasunFixDoneA=true;
 }
 renderBlock(data);

 // Debounced heavy renders: wait 300ms after last data change before re-rendering
 // This prevents 8+ renders firing on every single bid/NI click
 if(window._auctionRenderTimer) clearTimeout(window._auctionRenderTimer);
 window._auctionRenderTimer=setTimeout(function(){
  var _d=roomState; // use latest state, not captured closure
  try{renderPointsTab();}catch(e){console.error('renderPointsTab:',e);}
  try{renderLeaderboard(_d);}catch(e){console.error('renderLeaderboard:',e);}
  try{
   var _asEl=document.getElementById('allSquadsSection');
   if(!_asEl){
    var _lbTab=document.getElementById('leaderboard-tab');
    if(_lbTab){
     _asEl=document.createElement('div');
     _asEl.id='allSquadsSection';
     _asEl.style.cssText='margin-top:16px;';
     _asEl.innerHTML='<div class="pts-card"><div class="pts-hdr"><span class="pts-title">All Team Squads</span><button class="btn btn-ghost btn-sm" onclick="window.renderAllSquads()">Refresh</button></div><div id="allSquadsBody"></div></div>';
     _lbTab.appendChild(_asEl);
    }
   }
   if(_asEl) _asEl.style.display='block';
   window.renderAllSquads();
  }catch(e){console.error('allSquads:',e);}
  try{renderAnalytics(_d);}catch(e){console.error('renderAnalytics:',e);}
  try{
   if(document.getElementById('myteam-tab')?.style.display==='block') _mtRenderA();
   else if(myTeamName && _d.teams && _d.teams[myTeamName]) {
    var _newRLen=0; var _r=_d.teams[myTeamName].roster;
    if(_r) _newRLen=Array.isArray(_r)?_r.length:Object.keys(_r).length;
    if(!_sqSavedA||!_sqSavedA._rLen||_sqSavedA._rLen!==_newRLen){ _sqSavedA=null; }
   }
  }catch(e){console.error('myteam:',e);}
  try{renderMatchData(_d);}catch(e){console.error('renderMatchData:',e);}
  try{window.renderTrades(_d);}catch(e){console.error('renderTrades:',e);}
 },300);
 var _lBtn=document.getElementById('mt_lock_btn_A'); if(_lBtn){ if(isAdmin) _lBtn.style.display='inline-block'; _lBtn.textContent=data.squadLocked?'Unlock Changes':'Lock Changes'; _lBtn.style.background=data.squadLocked?'var(--err-bg)':'var(--surface)'; _lBtn.style.color=data.squadLocked?'var(--err)':'var(--txt2)'; }
 // Super Admin release lock button
 var _rlBtn=document.getElementById('mt_release_lock_btn_A');
 if(!_rlBtn&&isSuperAdminEmail(user?.email)){
  var _mtTab=document.getElementById('myteam-tab');
  if(_mtTab){
   _rlBtn=document.createElement('button');
   _rlBtn.id='mt_release_lock_btn_A';
   _rlBtn.className='btn btn-sm';
   _rlBtn.style.cssText='margin-left:8px;';
   _rlBtn.onclick=function(){window.toggleReleaseLock_A();};
   var _lBtnParent=document.getElementById('mt_lock_btn_A')?.parentElement;
   if(_lBtnParent) _lBtnParent.appendChild(_rlBtn);
  }
 }
 if(_rlBtn){
  _rlBtn.style.display=isSuperAdminEmail(user?.email)?'inline-block':'none';
  _rlBtn.textContent=data.releaseLocked?'Unlock Releases':'Lock Releases';
  _rlBtn.style.background=data.releaseLocked?'#ff4444':'var(--surface)';
  _rlBtn.style.color=data.releaseLocked?'#fff':'var(--txt2)';
 }
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
 return`<span class="badge ${isMe?'bpu':'bb'}">${m.teamName}${isMe?' (you)':''}
 </span>`;
 }).join('');
 }
 }

 if(data.currentBlock?.active){
 const pid=String(data.currentBlock.playerId);
 const p=data.players?.[pid]||data.players?.[parseInt(pid)];
 if(!p){blk.innerHTML=`<div class="blk-missing">Player not found (id:${pid}). Try re-initializing.</div>`;ctrl.style.display='none';return;}

 blk.classList.add('live');
 ctrl.style.display='block';
 document.getElementById('liveBidText').textContent=`\u20b9${data.currentBlock.currentBid.toFixed(2)}`;
 setTeamColorWash(T(p));

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
    return `<button class="qbtn${blocked?' qbtn-blocked':''}" ${blocked?'disabled':''}${title?` title="${title}"`:''}  onclick="window.addBid(${amt})">${lbl}${(cantAfford||quotaFull)?'<span class="blk-qbtn-x">x</span>':''}</button>`;
  }).join('');
})();

 const _blkPhotoId='blk-photo-'+Date.now();
 blk.innerHTML=`<div class="blk-player-card"><div class="blk-photo-ring" id="${_blkPhotoId}">${N(p).split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()}</div><div class="blk-player-info"><div class="pname">${N(p)}</div><div class="ptags"><span class="ptag">${T(p)}</span><span class="ptag role-icon-tag" title="${R(p)}">${roleIcon(R(p))} ${R(p)}</span><span class="ptag ${O(p)?'ov':'in'}">${O(p)?'Overseas':'Indian'}</span></div><div class="base-lbl">Base Price: \u20b9${(p.basePrice||0).toFixed(2)} Cr</div></div></div>`;
 // Async load player photo
 (async()=>{const url=await cbzGetImg(cbzPlayerImgId(N(p)));const el=document.getElementById(_blkPhotoId);if(el&&url)el.innerHTML=`<img src="${url}" alt="${N(p)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;})();

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
 niTeamsList.innerHTML=niTeams.map(t=>`<span class="ni-team-badge">${escapeHtml(t)}</span>`).join('');
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
 var _autoSellPid=String(data.currentBlock.playerId); // capture current player ID
 window.showAlert(`All others opted out -- auto-selling to ${lastBidder}!`,'ok');
 setTimeout(()=>{
  // Guard: verify the block still has the same player before selling
  if(roomState?.currentBlock?.active&&String(roomState.currentBlock.playerId)===_autoSellPid){
   window.sellPlayer(true);
  }
  autoSellInProgress=false;
 },800);
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
 clearTeamColorWash();
 // Hide NI controls when no active block
 const niC=document.getElementById('niControls');if(niC)niC.style.display='none';
 const niS=document.getElementById('niStrip');if(niS)niS.classList.remove('show');
 if(isAdmin){const p=document.getElementById('soldPreview');if(p)p.style.display='none';}
 const la=data.currentBlock?.lastAction;
 if(la==='unsold'){
 blk.innerHTML=`<div class="blk-unsold">\u274c UNSOLD</div>`;
 } else if(la?.startsWith('sold')){
 const pts=la.split('_');
 blk.innerHTML=`
 <div class="blk-sold">SOLD</div><div class="blk-sold-to">To <strong>${pts[2]}</strong></div><div class="blk-sold-price">\u20b9${parseFloat(pts[3]).toFixed(2)} Cr</div>`;
 } else if(data.auctionComplete){
 blk.innerHTML=`<div class="blk-complete-wrap"><div class="blk-complete-title">AUCTION COMPLETE</div><div class="blk-complete-sub">All teams have reached their player quota.</div>${isAdmin?`<button class="btn btn-cta" onclick="window.reinitiateAuction()">Reinitiate Auction (Unsold Players)</button>`:''}</div>`;
 } else {
 blk.innerHTML=`<div class="blk-ready">Ready -- pull a player to begin.</div>`;
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
 return`<tr><td class="ldg-idx">${i+1}</td><td class="ldg-name" onclick="window.showPlayerModal('${N(p).replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:6px;">${cbzAvatar(N(p),24)}${N(p)}</td><td><span class="badge bg">${T(p)}</span></td><td class="role-icon-cell" title="${R(p)}">${roleIcon(R(p))} ${R(p)}</td><td class="ldg-origin">${O(p)?' \ufe0f Overseas':' Indian'}</td><td>\u20b9${(p.basePrice||0).toFixed(2)}</td><td>${sc}</td><td class="ldg-sold-price">${p.soldPrice?'\u20b9'+p.soldPrice.toFixed(2):'--'}</td><td class="ldg-buyer">${p.soldTo||'--'}</td></tr>`;
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
 const on=id===t;
 if(el){ el.style.display=on?'block':'none';
  if(on){ el.classList.remove('tab-anim'); void el.offsetWidth; el.classList.add('tab-anim'); }
 }
 if(btn) btn.classList.toggle('active',on);
 // Update sidebar active link
 const sbLink=document.getElementById(`sb-${id}`);
 if(sbLink) sbLink.classList.toggle('active',on);
 try{
  if(on&&id==='players-season'&&roomState) renderPlayersSeason(roomState);
  if(on&&id==='myteam') window.renderMyTeamA();
  if(on&&id==='schedule') window.renderSchedule();
  if(on&&id==='trades'){ window.loadTradeDropdowns(); if(roomState) window.renderTrades(roomState); }
  if(on&&id==='auction') startLiveTicker();
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

 // Fetch fresh data from Firebase to avoid stale state race conditions
 get(ref(db,`auctions/${roomId}`)).then(snap=>{
  const freshData=snap.val();
  if(!freshData)return window.showAlert('Room data not found.');
  // Verify the block is still active with the same player
  if(!freshData.currentBlock?.active||String(freshData.currentBlock.playerId)!==pid){
   return window.showAlert('Block state changed. Sale cancelled.');
  }
  const freshBid=freshData.currentBlock.currentBid;
  const freshTn=freshData.currentBlock.lastBidderTeam;
  if(!freshTn)return window.showAlert('No bids placed.');
  const p=freshData.players?.[pid]||freshData.players?.[parseInt(pid)];
  const team=freshData.teams?.[freshTn];
  if(!p||!team)return window.showAlert(`Team "${freshTn}" not found.`);
  if(team.budget<freshBid)return window.showAlert(`Insufficient budget! ${freshTn} only has \u20b9${team.budget.toFixed(2)} Cr left.`);
  const roster=Array.isArray(team.roster)?[...team.roster]:(team.roster&&typeof team.roster==='object'?Object.values(team.roster):[]);
  const maxP=freshData.setup?.maxPlayers||freshData.maxPlayers||20;
  if(roster.length>=maxP)return window.showAlert(`${freshTn}'s roster is full!`);
  roster.push({name:p.name||p.n,role:p.role||p.r,iplTeam:p.iplTeam||p.t,isOverseas:!!(p.isOverseas||p.o),soldPrice:freshBid});
  const upd={};
  upd[`/teams/${freshTn}/roster`]=roster;
  upd[`/teams/${freshTn}/budget`]=parseFloat((team.budget-freshBid).toFixed(2));
  upd[`/players/${pid}/status`]='sold';
  upd[`/players/${pid}/soldTo`]=freshTn;
  upd[`/players/${pid}/soldPrice`]=freshBid;
  upd['/currentBlock']={active:false,lastAction:`sold_${pid}_${freshTn}_${freshBid}`,lastBidderName:null,lastBidderTeam:null,notInterested:null};
  return update(ref(db,`auctions/${roomId}`),upd).then(()=>{
   window.showSoldFlash(freshTn, freshBid, p.name||p.n);
   checkAuctionComplete();
  });
 }).catch(e=>window.showAlert(e.message));
};

// -- Check if all teams have reached their player quota --
function checkAuctionComplete(){
 if(!roomState?.teams||!roomState?.setup) return;
 const maxP=roomState.setup.maxPlayers||roomState.maxPlayers||20;
 const teams=Object.values(roomState.teams);
 if(!teams.length) return;
 const allFull=teams.every(t=>{
  const roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
  return roster.length>=maxP;
 });
 if(allFull&&!roomState.auctionComplete){
  // Mark all remaining available/unsold players as unsold
  const upd={};
  if(roomState.players){
   Object.entries(roomState.players).forEach(([pid,p])=>{
    if(p.status==='available') upd[`/players/${pid}/status`]='unsold';
   });
  }
  upd['/auctionComplete']=true;
  upd['/currentBlock']={active:false,lastAction:'auction_complete',lastBidderName:null,lastBidderTeam:null,notInterested:null};
  update(ref(db,`auctions/${roomId}`),upd).then(()=>{
   window.showAlert('All teams have reached their quota! Auction is complete.','ok');
  });
 }
}

// -- Reinitiate auction for unsold players (only teams below quota can bid) --
window.reinitiateAuction=function(){
 if(!isAdmin||!roomId||!roomState) return;
 const unsold=roomState.players?Object.values(roomState.players).filter(p=>p.status==='unsold'):[];
 if(!unsold.length) return window.showAlert('No unsold players to re-auction.');
 if(!confirm(`Re-open auction with ${unsold.length} unsold player${unsold.length===1?'':'s'}? Teams at max capacity will be locked out.`)) return;
 const upd={};
 unsold.forEach(p=>{ upd[`/players/${p.id}/status`]='available'; });
 upd['/auctionComplete']=false;
 update(ref(db,`auctions/${roomId}`),upd).then(()=>{
  window.showAlert(`${unsold.length} unsold player${unsold.length===1?'':'s'} re-entered the auction!`,'ok');
 }).catch(e=>window.showAlert(e.message));
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
function calcBattingPoints(runs, balls, fours, sixes, dismissal, isWinningTeam, isMotm, playerRole){
 if(dismissal==='noresult') return 0;
 let pts = 0;
 pts += runs * 1; // 1pt per run
 pts += Math.floor(runs / 25) * 10; // 10pts every 25 runs
 pts += fours * 1; // 1pt per four (boundary bonus)
 pts += sixes * 2; // 2pts per six
 // Duck: -5 if runs===0 and out (auto-detect). Only penalize Batter, All-rounder, Wicketkeeper — NOT pure Bowler.
 const isDuck = dismissal==='duck' || (runs===0 && dismissal==='out');
 const roleLower = (playerRole||'').toLowerCase();
 const isBowlerOnly = roleLower==='bowler';
 if(isDuck && !isBowlerOnly) pts -= 5;
 // Strike rate -- eligible if balls faced >= 10 OR runs scored >= 10
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
 div.className='sc-row sc-row--batting';
 div.innerHTML=`<input list="dlPlayers" placeholder="Player name" id="br${id}name" class="sc-input"><input type="number" placeholder="R" id="br${id}runs" min="0" class="sc-input sc-input--sm"><input type="number" placeholder="B" id="br${id}balls" min="0" class="sc-input sc-input--sm"><input type="number" placeholder="4s" id="br${id}fours" min="0" class="sc-input sc-input--sm"><input type="number" placeholder="6s" id="br${id}sixes" min="0" class="sc-input sc-input--sm"><select id="br${id}dis" class="sc-input"><option value="out">Out</option><option value="notout">Not Out</option><option value="duck">Duck (0)</option></select><button onclick="document.getElementById('br${id}').remove();battingRowCount--;" class="btn btn-danger btn-sm sc-remove-btn">x</button>`;
 document.getElementById('battingRows').appendChild(div);
 const dl=document.getElementById('dlPlayers');
 if(!dl) document.getElementById('battingRows').insertAdjacentHTML('beforebegin',playerDatalist());
};;;;

window.addBowlingRow=function(){
 const id=bowlingRowCount++;
 const div=document.createElement('div');
 div.id=`bow${id}`;
 div.className='sc-row sc-row--bowling';
 div.innerHTML=`<input list="dlPlayers" placeholder="Player name" id="bow${id}name" class="sc-input"><input type="number" placeholder="Ov" id="bow${id}overs" min="0" step="0.1" oninput="window.autoEco('bow${id}')" class="sc-input sc-input--sm"><input type="number" placeholder="R" id="bow${id}runs" min="0" oninput="window.autoEco('bow${id}')" class="sc-input sc-input--sm"><input type="number" placeholder="W" id="bow${id}wkts" min="0" class="sc-input sc-input--sm"><input type="number" placeholder="Eco" id="bow${id}eco" min="0" step="0.01" title="Auto-fills from Ov+R. Click to override." class="sc-input sc-input--sm"><input type="number" placeholder="0s" id="bow${id}dots" min="0" class="sc-input sc-input--sm"><input type="number" placeholder="Mdns" id="bow${id}maidens" min="0" class="sc-input sc-input--sm"><button onclick="document.getElementById('bow${id}').remove();bowlingRowCount--;" class="btn btn-danger btn-sm sc-remove-btn">x</button>`;
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
 div.className='sc-row sc-row--fielding';
 div.innerHTML=`
 <input list="dlPlayers" placeholder="Player name" id="fld${id}name" class="sc-input"><input type="number" placeholder="Catches" id="fld${id}catches" min="0" class="sc-input"><input type="number" placeholder="Stumpings" id="fld${id}stumpings" min="0" class="sc-input"><input type="number" placeholder="Run-outs" id="fld${id}runouts" min="0" class="sc-input"><button onclick="document.getElementById('fld${id}').remove();fieldingRowCount--;" class="btn btn-danger btn-sm sc-remove-btn">Remove</button>`;
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

 // Lookup player role from roomState or rawData for duck penalty filtering
 function _lookupPlayerRole(name){
 const nLow=name.trim().toLowerCase();
 const nClean=nLow.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
 if(roomState?.players){
  const p=Object.values(roomState.players).find(p=>{
   const pn=(p.name||p.n||'').toLowerCase().trim();
   return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;
  });
  if(p) return p.role||p.r||'';
 }
 const rd=rawData.find(p=>{
  const pn=(p.n||'').toLowerCase().trim();
  return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;
 });
 return rd?(rd.r||''):'';
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
 // Lookup player role for duck penalty filtering
 const _pRole=_lookupPlayerRole(name);
 const isDuck=(runs===0&&dis==='out')||dis==='duck';
 const pts=calcBattingPoints(runs,balls,fours,sixes,dis,false,isMot,_pRole);
 addPts(name,pts,`Batting(${runs}r ${balls}b${isDuck&&_pRole.toLowerCase()!=='bowler'?' DUCK':''})`);
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
 // Player names in roomState include nationality e.g. "Jacob Duffy* (NZ)"
 // But scorecard form names are plain e.g. "Jacob Duffy"
 // Strip the * (XX) suffix for matching
 if(winner){
 var _plist = roomState?.players ? Object.values(roomState.players) : (rawData || []);
 _plist.forEach(p=>{
 const pnameFull=(p.name||p.n||'').trim().toLowerCase();
 const pnameClean=pnameFull.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
 const pteam=(p.iplTeam||p.t||'').toUpperCase();
 if(pteam===winner){
  var matched=playerPts[pnameFull]||playerPts[pnameClean];
  if(matched){
   matched.pts+=5;
   matched.breakdown.push('Winning team: +5');
  }
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
 var warningHtml='';
 if(!data.winner){
  warningHtml='<div class="alert alert--warn">⚠ No winning team entered — +5 win bonus NOT included. Fill in the "Winning IPL Team" field above.</div>';
 } else {
  warningHtml='<div class="alert alert--ok">Winner: <strong>'+escapeHtml(data.winner)+'</strong> — +5 bonus applied to all '+escapeHtml(data.winner)+' players in the scorecard.</div>';
 }
 content.innerHTML=warningHtml+`<div class="twrap"><table class="preview-table"><thead><tr><th>Player</th><th class="text-right">Points</th><th>Breakdown</th></tr></thead><tbody>${entries.map(e=>`<tr><td class="text-strong">${e.name}</td><td class="text-right pts-cell ${e.pts>=0?'pts-pos':'pts-neg'}">${e.pts>=0?'+':''}${e.pts}</td><td class="text-dim text-sm">${e.breakdown.join(' . ')}</td></tr>`).join('')}</tbody></table></div>`;
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
 // Build activeSquad set per team: only XI + Bench players score
 var _activeSquadMap={}; // teamName -> Set of lowercase player names in XI+Bench
 if(roomState&&roomState.teams){
  Object.values(roomState.teams).forEach(function(t){
   var roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
   roster.forEach(function(p){
    var fn=(p.name||p.n||'').toLowerCase().trim();
    var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    _ownerMap[fn]=t.name;
    _ownerMap[cn]=t.name;
   });
   var squad=t.activeSquad||null;
   if(squad&&Array.isArray(squad)){
    var sSet=new Set();
    squad.forEach(function(n){
     var fn2=n.toLowerCase().trim();
     sSet.add(fn2);
     sSet.add(fn2.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());
    });
    _activeSquadMap[t.name]=sSet;
   }
   // If no activeSquad saved, leave _activeSquadMap[t.name] undefined
  });
 }
 Object.entries(data.playerPts).forEach(([key,val])=>{
 var fbKey=key.replace(/[.#$\/\[\]]/g,'_');
 var ownerTeam=_ownerMap[(val.name||'').toLowerCase().trim()]||'';
 var inSquad;
 if(ownerTeam&&_activeSquadMap[ownerTeam]){
  inSquad=_activeSquadMap[ownerTeam].has((val.name||'').toLowerCase().trim());
 }
 matchRecord.players[fbKey]={name:val.name,pts:val.pts,breakdown:val.breakdown.join(' | '),ownedBy:ownerTeam,inActiveSquad:inSquad};
 });

 // Save squad snapshots for all teams at this moment
 matchRecord.squadSnapshots=buildSquadSnapshots(roomState?.teams);

 set(ref(db,`auctions/${roomId}/matches/${matchId}`),matchRecord)
 .then(()=>{
 window.showAlert(`Match "${data.label}" saved! Points updated for all teams.`,'ok');
 // Increment stored leaderboard totals
 var xiMult=parseFloat(roomState?.xiMultiplier)||1;
 var contrib=computeMatchContribution(matchRecord, matchRecord.squadSnapshots, roomState?.teams, xiMult);
 _incrementLeaderboardTotalsA(contrib);
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
 tbody.innerHTML='<tr><td colspan="8" class="pts-empty">No match data yet. Admin can add scorecards above.</td></tr>';
 return;
 }

 tbody.innerHTML=sorted.map((p,i)=>{
 const key=p.name.toLowerCase();
 const owner=ownerMap[key]||'<span class="pts-unowned">Unowned</span>';
 const role=roleMap[key]||'--';
 const iplTeam=iplTeamMap[key]||'--';
 const ptsCls=p.pts>=0?'pts-val-pos':'pts-val-neg';
 const histTitle=p.matches.map(m=>`${m.label}: ${m.pts>=0?'+':''}${m.pts} (${m.breakdown})`).join('\n');
 return `<tr><td class="pts-idx">${i+1}</td><td class="pts-name" onclick="window.showPlayerModal('${p.name.replace(/'/g,"\\'")}')">${p.name}</td><td><span class="badge bg">${iplTeam}</span></td><td class="pts-owner">${typeof owner==='string'?owner:owner}</td><td class="pts-role">${role}</td><td class="pts-count">${p.matchCount}</td><td class="pts-val ${ptsCls}">${p.pts>=0?'+':''}${p.pts}</td><td><button class="match-hist-btn" title="${histTitle.replace(/"/g,"'")}">${p.matchCount}</button></td></tr>`;
 }).join('');
}
window.renderPointsTab=renderPointsTab;

// -- Build squad snapshots for all teams (used at scorecard push time) --
function buildSquadSnapshots(teamsData,maxPlayers){
 var snapshots={};
 if(!teamsData) return snapshots;
 var mp=maxPlayers||roomState?.maxPlayers||roomState?.setup?.maxPlayers||20;
 Object.values(teamsData).forEach(function(team){
  var roster=Array.isArray(team.roster)?team.roster:(team.roster?Object.values(team.roster):[]);
  if(!roster.length) return;
  var allNames=roster.map(function(p){return p.name||p.n||'';});
  var xi,bench,reserves;
  if(team.activeSquad&&Array.isArray(team.activeSquad)&&team.activeSquad.length>0){
   xi=team.activeSquad.slice(0,11);
   bench=team.activeSquad.slice(11);
   var sqSet=new Set(team.activeSquad.map(function(n){return n.toLowerCase().trim();}));
   reserves=allNames.filter(function(n){return!sqSet.has(n.toLowerCase().trim());});
  } else if(allNames.length<=mp&&allNames.length<=11){
   // All players fit in XI (e.g. maxPlayers=11, roster=11) — treat all as Playing XI
   xi=allNames.slice();
   bench=[];
   reserves=[];
  } else {
   var xiEnd=Math.min(11,allNames.length);
   var benchEnd=Math.min(xiEnd+5,allNames.length);
   xi=allNames.slice(0,xiEnd);
   bench=allNames.slice(xiEnd,benchEnd);
   reserves=allNames.slice(benchEnd);
  }
  snapshots[team.name]={xi:xi,bench:bench,reserves:reserves||[]};
 });
 return snapshots;
}

// -- Compute a single match's contribution to each team --
function computeMatchContribution(matchData, matchSnaps, teamsData, xiMultiplier){
 var contrib={};
 if(!matchData?.players) return contrib;
 var hasStoredSnaps=!!matchData.squadSnapshots;
 var rosterOwnerMap={};
 if(teamsData){
  Object.values(teamsData).forEach(function(t){
   var roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
   roster.forEach(function(p){
    var fn=(p.name||p.n||'').toLowerCase().trim();
    var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    rosterOwnerMap[fn]=t.name;
    rosterOwnerMap[cn]=t.name;
   });
  });
 }
 var mXI={}, mBench={};
 Object.entries(matchSnaps||{}).forEach(function(e){
  var tn=e[0], snap=e[1];
  var xiS=new Set(), bnS=new Set();
  (snap.xi||[]).forEach(function(n){var fn=n.toLowerCase().trim();xiS.add(fn);xiS.add(fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
  (snap.bench||[]).forEach(function(n){var fn=n.toLowerCase().trim();bnS.add(fn);bnS.add(fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
  mXI[tn]=xiS; mBench[tn]=bnS;
 });
 Object.values(matchData.players).forEach(function(p){
  var key=(p.name||'').toLowerCase();
  var cleanKey=key.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
  var owner=p.ownedBy||rosterOwnerMap[key]||rosterOwnerMap[cleanKey]||'';
  if(!owner) return;
  var mult=0;
  if(mXI[owner]&&(mXI[owner].has(key)||mXI[owner].has(cleanKey))) mult=xiMultiplier;
  else if(mBench[owner]&&(mBench[owner].has(key)||mBench[owner].has(cleanKey))) mult=1;
  // Fallback: if no stored snapshots and player has ownedBy but isn't in current squad
  // (e.g., player was released/traded after this match), still count their points at 1x
  if(mult===0&&!hasStoredSnaps&&owner&&(p.ownedBy||rosterOwnerMap[key]||rosterOwnerMap[cleanKey])){
   mult=1;
  }
  if(mult>0){
   var mPts=Math.round((p.pts||0)*mult*100)/100;
   if(!contrib[owner]) contrib[owner]={pts:0,players:{}};
   contrib[owner].pts+=mPts;
   contrib[owner].players[cleanKey]=(contrib[owner].players[cleanKey]||0)+mPts;
  }
 });
 return contrib;
}

// -- Increment stored leaderboard totals for a single match's contribution (auction) --
async function _incrementLeaderboardTotalsA(contrib){
 if(!roomId||!contrib||!Object.keys(contrib).length) return;
 try{
  var snap=await get(ref(db,'auctions/'+roomId+'/leaderboardTotals'));
  var stored=snap.val()||{};
  Object.entries(contrib).forEach(function(ce){
   var tn=ce[0], c=ce[1];
   if(!stored[tn]) stored[tn]={pts:0,topPlayer:'--',topPts:0,playerCount:0};
   stored[tn].pts=Math.round((stored[tn].pts+c.pts)*100)/100;
   var bestN='--',bestP=0,pC=0;
   Object.entries(c.players).forEach(function(pe){if(pe[1]!==0)pC++;if(pe[1]>bestP){bestP=pe[1];bestN=pe[0];}});
   stored[tn].playerCount=(stored[tn].playerCount||0)+pC;
   if(bestP>stored[tn].topPts){stored[tn].topPts=bestP;stored[tn].topPlayer=bestN;}
  });
  await set(ref(db,'auctions/'+roomId+'/leaderboardTotals'),stored);
 }catch(e){console.error('_incrementLeaderboardTotalsA:',e);}
}

// -- Recalculate leaderboard totals from all matches (admin tool, auction) --
window.recalcLeaderboard=async function(){
 if(!roomId||!roomState) return;
 if(!confirm('Recalculate leaderboard totals from all match data? This will overwrite current stored totals.')) return;
 window.showAlert('Recalculating...','info');
 var matches=roomState.matches||{};
 var teams=roomState.teams||{};
 var xiMult=parseFloat(roomState.xiMultiplier)||1;
 var currentSnaps=buildSquadSnapshots(teams);
 var totals={};
 Object.values(teams).forEach(function(t){
  totals[t.name]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};
 });
 Object.entries(matches).forEach(function(me){
  var mid=me[0], m=me[1];
  var matchSnaps=m.squadSnapshots||currentSnaps;
  var contrib=computeMatchContribution(m, matchSnaps, teams, xiMult);
  Object.entries(contrib).forEach(function(ce){
   var tn=ce[0], c=ce[1];
   if(!totals[tn]) totals[tn]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};
   totals[tn].pts+=c.pts;
   Object.entries(c.players).forEach(function(pe){
    totals[tn]._players[pe[0]]=(totals[tn]._players[pe[0]]||0)+pe[1];
   });
  });
 });
 var toStore={};
 Object.entries(totals).forEach(function(te){
  var tn=te[0], t=te[1];
  var topP='--', topPts=0, pCount=0;
  Object.entries(t._players).forEach(function(pe){
   if(pe[1]!==0) pCount++;
   if(pe[1]>topPts){topPts=pe[1];topP=pe[0];}
  });
  if(teams[tn]){
   var roster=Array.isArray(teams[tn].roster)?teams[tn].roster:(teams[tn].roster?Object.values(teams[tn].roster):[]);
   var found=roster.find(function(x){return(x.name||x.n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===topP;});
   if(found) topP=found.name||found.n||topP;
  }
  toStore[tn]={pts:Math.round(t.pts*100)/100,topPlayer:topP,topPts:Math.round(topPts*100)/100,playerCount:pCount};
 });
 try{
  await set(ref(db,'auctions/'+roomId+'/leaderboardTotals'),toStore);
  window.showAlert('Leaderboard totals recalculated and saved.','ok');
 }catch(e){
  window.showAlert('Failed: '+e.message);
 }
};

// -- Render Leaderboard --
function renderLeaderboard(data){
 if(!data) return;
 const matches=data.matches||{};
 const matchIds=Object.keys(matches).sort((a,b)=>(matches[a].timestamp||0)-(matches[b].timestamp||0));
 const xiMultiplier=parseFloat(data.xiMultiplier)||1;
 const mp=data.maxPlayers||data.setup?.maxPlayers||20;

 // Build per-match contributions for ALL matches
 const teamPts={};
 const perMatchData={}; // {mid: {teamName: {pts, players:{name:pts}}}}
 if(data.teams){
  Object.values(data.teams).forEach(team=>{
   const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
   const spent=roster.reduce((s,p)=>s+(p.soldPrice||0),0);
   teamPts[team.name]={squadValid:team.squadValid!==false,pts:0,topPlayer:'--',topPts:0,playerCount:0,spent:Math.round(spent*100)/100,perMatch:{}};
  });
 }

 const playerTotal={};
 const currentSnaps=buildSquadSnapshots(data.teams,mp);

 matchIds.forEach(mid=>{
  const m=matches[mid];
  if(!m?.players) return;
  const matchSnaps=m.squadSnapshots||currentSnaps;
  const contrib=computeMatchContribution(m,matchSnaps,data.teams,xiMultiplier);
  perMatchData[mid]=contrib;

  // Accumulate
  Object.entries(contrib).forEach(([tn,c])=>{
   if(!teamPts[tn]) return;
   teamPts[tn].pts+=c.pts;
   teamPts[tn].perMatch[mid]=c.pts;
   Object.entries(c.players).forEach(([pn,pp])=>{
    if(pp!==0) teamPts[tn].playerCount++;
    if(pp>teamPts[tn].topPts){
     teamPts[tn].topPts=pp;
     // Get proper case name
     const roster2=data.teams[tn]?(Array.isArray(data.teams[tn].roster)?data.teams[tn].roster:Object.values(data.teams[tn].roster||{})):[];
     const found=roster2.find(x=>(x.name||x.n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===pn);
     teamPts[tn].topPlayer=found?(found.name||found.n||'--'):pn;
    }
   });
  });

  // Player totals for stats
  Object.values(m.players).forEach(p=>{
   const key=(p.name||'').toLowerCase();
   playerTotal[key]=(playerTotal[key]||0)+(p.pts||0);
  });
 });

 // Build per-player-per-team multiplied totals from perMatchData for expand panels
 const _playerMultPts={};
 Object.values(perMatchData).forEach(matchContrib=>{
  Object.entries(matchContrib).forEach(([tn,c])=>{
   if(!_playerMultPts[tn]) _playerMultPts[tn]={};
   Object.entries(c.players).forEach(([pn,pp])=>{
    _playerMultPts[tn][pn]=(_playerMultPts[tn][pn]||0)+pp;
   });
  });
 });

 // Round pts
 Object.values(teamPts).forEach(t=>{t.pts=Math.round(t.pts*100)/100;});

 // -- Leaderboard match filter --
 const lbFilter=document.getElementById('lbMatchFilter');
 if(lbFilter){
  const prev=lbFilter.value;
  lbFilter.innerHTML='<option value="all">Season Total</option>';
  matchIds.forEach(mid=>{
   const opt=document.createElement('option');
   opt.value=mid;opt.textContent=matches[mid].label||mid;
   lbFilter.appendChild(opt);
  });
  if(prev) lbFilter.value=prev;
 }

 const filterVal=lbFilter?.value||'all';

 // If filtering a single match, override teamPts with that match's data
 let displayPts;
 if(filterVal!=='all'&&perMatchData[filterVal]){
  displayPts={};
  if(data.teams) Object.values(data.teams).forEach(t=>{
   const roster=Array.isArray(t.roster)?t.roster:Object.values(t.roster||{});
   const spent=roster.reduce((s,p)=>s+(p.soldPrice||0),0);
   const mContrib=perMatchData[filterVal][t.name];
   displayPts[t.name]={
    squadValid:t.squadValid!==false, pts:mContrib?Math.round(mContrib.pts*100)/100:0,
    topPlayer:'--',topPts:0,playerCount:0,spent:Math.round(spent*100)/100,
    players:mContrib?.players||{}
   };
   if(mContrib) Object.entries(mContrib.players).forEach(([pn,pp])=>{
    if(pp!==0) displayPts[t.name].playerCount++;
    if(pp>displayPts[t.name].topPts){displayPts[t.name].topPts=pp;displayPts[t.name].topPlayer=pn;}
   });
  });
 } else {
  displayPts=teamPts;
 }

 const sorted=Object.entries(displayPts).sort((a,b)=>b[1].pts-a[1].pts);

 // ── Podium (top 3) ──
 const podWrap=document.getElementById('lbPodiumWrap');
 if(podWrap){
  const top3=sorted.slice(0,3);
  if(top3.length>=2){
   podWrap.style.display='flex';
   const crowns=['🥇','🥈','🥉'];
   const order=[1,0,2]; // display: 2nd, 1st, 3rd
   podWrap.innerHTML=order.map(i=>{
    if(!top3[i]) return '';
    const [pn,info]=top3[i];
    const ppts=Math.round(info.pts);
    return `<div class="lb-pod lb-pod--${i+1}"><div class="lb-pod-crown">${crowns[i]}</div><div class="lb-pod-photo">${pn.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase()}</div><div class="lb-pod-name">${pn}</div><div class="lb-pod-pts">${ppts>=0?'+':''}${ppts}</div><div class="lb-pod-plinth"></div></div>`;
   }).join('');
  } else { podWrap.style.display='none'; }
 }

 // Stats strip
 const _lbM=document.getElementById('lb-matches');
 const _lbP=document.getElementById('lb-players-scored');
 const _lbT=document.getElementById('lb-top-pts');
 const topPts=sorted.length?sorted[0][1].pts:0;
 if(_lbM) counterUp(_lbM,matchIds.length);
 if(_lbP) counterUp(_lbP,Object.keys(playerTotal).length);
 if(_lbT) counterUp(_lbT,Math.round(topPts));

 const body=document.getElementById('leaderboardBody');
 if(!body) return;
 if(!sorted.length){
  body.innerHTML='<div class="empty">No match data yet.</div>';
  return;
 }

 const medalClasses=['lb-rank-1','lb-rank-2','lb-rank-3'];
 const rows=sorted.map(([name,info],i)=>{
  const rankEl=i<3
   ?`<div class="lb-rank ${medalClasses[i]}">${i+1}</div>`
   :`<div class="lb-rank lb-rank-other">${i+1}</div>`;
  const bar=sorted[0][1].pts>0?Math.round((info.pts/sorted[0][1].pts)*100):0;
  const ppc=info.spent>0?(info.pts/info.spent).toFixed(1):'--';
  const dq=!info.squadValid;
  let sparkline='';
  if(filterVal==='all'&&teamPts[name]?.perMatch){
   sparkline='<div class="lb-sparkline">'+matchIds.map(mid=>{
    const mPts=teamPts[name].perMatch[mid]||0;
    const maxMPts=Math.max(...Object.values(teamPts).map(t=>Math.abs(t.perMatch[mid]||0)),1);
    const h=Math.max(2,Math.round(Math.abs(mPts)/maxMPts*14));
    return `<div title="${(matches[mid]?.label||mid)}: ${mPts>=0?'+':''}${mPts}" class="lb-spark-bar ${mPts>=0?'lb-spark-bar-pos':'lb-spark-bar-neg'}" style="height:${h}px;"></div>`;
   }).join('')+'</div>';
  }
  // Build player expand panel
  const expandId='lb-exp-'+name.replace(/[^a-zA-Z0-9]/g,'_');
  const displayData=filterVal!=='all'&&info.players?info.players:(teamPts[name]?.perMatch?null:null);
  let expandPlayers=[];
  if(filterVal!=='all'&&info.players){
   expandPlayers=Object.entries(info.players).map(([pn,pp])=>({name:pn,pts:pp,xi:true})).sort((a,b)=>b.pts-a.pts);
  } else if(filterVal==='all'&&data.teams&&data.teams[name]){
   const mPts=_playerMultPts[name]||{};
   const rosterArr=Array.isArray(data.teams[name].roster)?data.teams[name].roster:Object.values(data.teams[name].roster||{});
   expandPlayers=rosterArr.map(p=>{
    const k=(p.name||p.n||'').toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    const k2=(p.name||p.n||'').toLowerCase().trim();
    const inSquad=(k in mPts)||(k2 in mPts);
    const pp=mPts[k]||mPts[k2]||0;
    return {name:p.name||p.n||'',pts:Math.round(pp*100)/100,xi:true,inSquad};
   }).filter(ep=>ep.inSquad).sort((a,b)=>b.pts-a.pts);
  }
  const expandHTML=expandPlayers.length?`<div class="lb-expand-inner"><div class="lb-expand-title">Player Points Breakdown</div>`+
   expandPlayers.map(ep=>{
    const ptsCls=ep.pts>0?'lb-prow-pts-pos':ep.pts<0?'lb-prow-pts-neg':'lb-prow-pts-zer';
    return `<div class="lb-prow">${cbzAvatar(ep.name,20)}<span class="lb-prow-name">${ep.name}</span><span class="lb-prow-pts ${ptsCls}">${ep.pts>=0?'+':''}${Math.round(ep.pts)}</span></div>`;
   }).join('')+`</div>`:'';
  const rowHtml=`<div class="lb-row${dq?' lb-row-dq':''}" onclick="window._lbToggleExpand('${expandId}')">${rankEl}<div class="lb-info"><div class="lb-team">${name}${dq?` <span class="lb-dq-badge">DQ</span>`:``}<span class="lb-row-chevron">▼</span></div><div class="lb-meta">Top: ${info.topPlayer} (${info.topPts>=0?'+':''}${Math.round(info.topPts)} pts) | ${info.playerCount} scorers | <span class="lb-ppc">${ppc} pts/Cr</span></div><div class="lb-bar-track"><div class="lb-bar-fill" style="width:${bar}%;"></div></div>${sparkline}</div><div class="lb-pts">${info.pts>=0?'+':''}${Math.round(info.pts)}</div></div>`;
  const panelHtml=`<div class="lb-expand-panel" id="${expandId}">${expandHTML}</div>`;
  return rowHtml+panelHtml;
 });
 body.innerHTML=rows.join('');
 // Animate bars after render
 requestAnimationFrame(()=>{
  body.querySelectorAll('.lb-bar-fill').forEach(el=>{
   const w=el.style.width; el.style.width='0';
   requestAnimationFrame(()=>{ el.style.width=w; });
  });
 });
}

window._lbToggleExpand=function(id){
 const panel=document.getElementById(id);
 if(!panel) return;
 const row=panel.previousElementSibling;
 const isOpen=panel.classList.contains('open');
 // Close all first
 document.querySelectorAll('.lb-expand-panel.open').forEach(p=>{ p.classList.remove('open'); p.previousElementSibling?.classList.remove('lb-expanded'); });
 if(!isOpen){ panel.classList.add('open'); row?.classList.add('lb-expanded'); }
};

// -- Show All Squads section for super admin --
window.renderAllSquads=function(){
 var section=document.getElementById('allSquadsSection');
 var body=document.getElementById('allSquadsBody');
 if(!body||!roomState||!roomState.teams) return;

 // Aggregate all match points per player
 var matches=roomState.matches||{};
 var pts={};
 Object.values(matches).forEach(function(m){
  if(!m.players) return;
  Object.values(m.players).forEach(function(p){
   var k=(p.name||'').toLowerCase();
   pts[k]=(pts[k]||0)+(p.pts||0);
  });
 });

 var html='';
 Object.values(roomState.teams).forEach(function(team){
  var roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
  if(!roster.length) return;
  var allNames=roster.map(function(p){return p.name||p.n||'';});

  // Derive XI / Bench / Reserves
  var xi,bench,reserves;
  if(team.activeSquad&&Array.isArray(team.activeSquad)&&team.activeSquad.length>0){
   // activeSquad = xi.concat(bench) — first 11 are XI, rest are Bench
   xi=team.activeSquad.slice(0,11);
   bench=team.activeSquad.slice(11);
   var sqSet=new Set(team.activeSquad.map(function(n){return n.toLowerCase().trim();}));
   reserves=allNames.filter(function(n){return!sqSet.has(n.toLowerCase().trim());});
  } else {
   var xiEnd=Math.min(11,allNames.length);
   var benchEnd=Math.min(xiEnd+5,allNames.length);
   xi=allNames.slice(0,xiEnd);
   bench=allNames.slice(xiEnd,benchEnd);
   reserves=allNames.slice(benchEnd);
  }

  function pRow(name,section){
   var p=roster.find(function(x){return(x.name||x.n||'')===name;})||{};
   var iplTeam=(p.iplTeam||p.t||'').toUpperCase();
   var role=(p.role||p.r||'');
   var isOs=!!(p.isOverseas||p.o||name.indexOf('*')>=0);
   var k=name.toLowerCase().trim();
   var kc=k.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
   var playerPts=pts[k]||pts[kc]||0;
   var ptsCls=playerPts>0?'sq-p-pts-pos':playerPts<0?'sq-p-pts-neg':'sq-p-pts-zero';
   return '<tr><td class="sq-p-name" onclick="window.showPlayerModal(\''+name.replace(/'/g,"\\'")+'\')" style="display:flex;align-items:center;gap:6px;">'+cbzAvatar(name,22)+(isOs?'<span class="sq-p-os-dot">\u25cf</span>':'')+name+'</td><td class="sq-p-ipl">'+iplTeam+'</td><td class="sq-p-role">'+role+'</td><td class="sq-p-pts '+ptsCls+'">'+(playerPts>=0?'+':'')+playerPts+'</td></tr>';
  }

  var teamTotal=0;
  xi.concat(bench).forEach(function(n){
   var k=n.toLowerCase().trim();
   var kc=k.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
   teamTotal+=(pts[k]||pts[kc]||0);
  });

  html+='<div class="sq-card">';
  html+='<div class="sq-card-hdr"><strong class="sq-card-name">'+team.name+'</strong><span class="sq-card-pts">'+(teamTotal>=0?'+':'')+teamTotal+'</span></div>';
  html+='<table class="sq-table">';

  // XI
  html+='<tr><td colspan="4" class="sq-section-hdr sq-section-xi">Playing XI ('+xi.length+')</td></tr>';
  xi.forEach(function(n){html+=pRow(n,'xi');});

  // Bench
  html+='<tr><td colspan="4" class="sq-section-hdr sq-section-bench">Bench ('+bench.length+')</td></tr>';
  bench.forEach(function(n){html+=pRow(n,'bench');});

  // Reserves
  if(reserves.length){
   html+='<tr><td colspan="4" class="sq-section-hdr sq-section-reserves">Reserves ('+reserves.length+')</td></tr>';
   reserves.forEach(function(n){html+=pRow(n,'reserves');});
  }

  html+='</table></div>';
 });

 body.innerHTML=html||'<div class="empty">No teams found.</div>';
};

// -- Player Performance Modal --
window.showPlayerModal=function(playerName){
 if(!roomState||!playerName) return;
 const modal=document.getElementById('playerModal');
 const nameEl=document.getElementById('pmPlayerName');
 const metaEl=document.getElementById('pmPlayerMeta');
 const bodyEl=document.getElementById('pmPlayerBody');
 if(!modal||!nameEl) return;

 nameEl.textContent=playerName;
 const nLow=playerName.toLowerCase().trim();
 const nClean=nLow.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();

 // Find player info
 let role='',iplTeam='',isOs=false,soldPrice=0,owner='';
 if(roomState.players){
  const pArr=Array.isArray(roomState.players)?roomState.players:Object.values(roomState.players);
  const found=pArr.find(p=>{const pn=(p.name||p.n||'').toLowerCase().trim();return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
  if(found){role=found.role||found.r||'';iplTeam=found.iplTeam||found.t||'';isOs=O(found);soldPrice=found.soldPrice||0;owner=found.soldTo||'';}
 }
 // Also check rosters for owner + soldPrice
 if(roomState.teams){
  Object.values(roomState.teams).forEach(t=>{
   const roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
   const p=roster.find(x=>{const xn=(x.name||x.n||'').toLowerCase().trim();return xn===nLow||xn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
   if(p){owner=t.name;soldPrice=p.soldPrice||soldPrice;if(!role)role=p.role||p.r||'';if(!iplTeam)iplTeam=p.iplTeam||p.t||'';}
  });
 }

 metaEl.innerHTML=`
  <span class="badge bg">${iplTeam||'--'}</span>
  <span class="badge bb">${role||'--'}</span>
  ${isOs?'<span class="badge pm-overseas-badge">Overseas</span>':'<span class="badge bb">Indian</span>'}
  <span class="pm-owner-info">${owner?'Owned by: '+owner:'Unowned'}</span>
  ${soldPrice?`<span class="pm-price-info">Bought for: \u20b9${soldPrice.toFixed(2)} Cr</span>`:''}
 `;

 // Build match-by-match breakdown
 const matches=roomState.matches||{};
 const matchList=Object.entries(matches).sort((a,b)=>(a[1].timestamp||0)-(b[1].timestamp||0));
 let totalPts=0;
 let rows='';
 matchList.forEach(([mid,m])=>{
  if(!m.players) return;
  const pData=Object.values(m.players).find(p=>{const pn=(p.name||'').toLowerCase().trim();return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
  if(!pData) return;
  totalPts+=pData.pts||0;
  const ptsColCls=(pData.pts||0)>=0?'md-td-pts-pos':'md-td-pts-neg';
  rows+=`<tr class="pm-row">
   <td class="pm-td pm-td-match">${escapeHtml(m.label||mid)}</td>
   <td class="pm-td pm-td-pts ${ptsColCls}">${(pData.pts||0)>=0?'+':''}${pData.pts||0}</td>
   <td class="pm-td pm-td-bd">${(pData.breakdown||'').replace(/\|/g,' | ')}</td>
  </tr>`;
 });

 if(!rows){
  bodyEl.innerHTML='<div class="pm-no-data">No match data for this player yet.</div>';
 } else {
  const totalColCls=totalPts>=0?'md-td-pts-pos':'md-td-pts-neg';
  bodyEl.innerHTML=`
   <div class="pm-season-total">
    <span class="pm-season-label">Season Total</span>
    <span class="pm-season-val ${totalColCls}">${totalPts>=0?'+':''}${totalPts}</span>
   </div>
   <div class="md-overflow"><table class="pm-table">
    <thead><tr><th class="pm-th">Match</th><th class="pm-th pm-th-right">Points</th><th class="pm-th">Breakdown</th></tr></thead>
    <tbody>${rows}</tbody>
   </table></div>`;
 }
 modal.classList.add('open');
};

// -- Render Analytics --
function renderAnalytics(data){
 if(!data) return;
 const matches=data.matches||{};
 // ── Aggregate per-player stats from all matches ──
 const playerTotal={};
 Object.values(matches).forEach(m=>{
  if(!m?.players) return;
  Object.values(m.players).forEach(p=>{
   const key=(p.name||'').toLowerCase();
   if(!playerTotal[key]) playerTotal[key]={name:p.name,pts:0,runs:0,balls:0,fours:0,sixes:0,wkts:0,overs:0,bowlRuns:0,ecoStored:0,ecoCount:0,catches:0,stumpings:0,runouts:0,matchCount:0,highScore:0,hundreds:0,fifties:0,nineties:0,fiveWkts:0,threeWkts:0,inns:0,bowlInns:0};
   const s=playerTotal[key]; s.pts+=(p.pts||0); s.matchCount++;
   const bd=p.breakdown||'';
   const batM=bd.match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x\u00d7]4)?(?:\s+(\d+)[x\u00d7]6)?/);
   if(batM){
    const r=+batM[1]; s.runs+=r; s.balls+=+batM[2]; s.fours+=+(batM[3]||0); s.sixes+=+(batM[4]||0); s.inns++;
    if(r>s.highScore) s.highScore=r;
    if(r>=100) s.hundreds++;
    else if(r>=90) s.nineties++;
    if(r>=50&&r<100) s.fifties++;
   }
   const bowM=bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?[^)]*\)/);
   if(bowM){
    const w=+bowM[1]; const ov=+bowM[2]; s.wkts+=w; s.overs+=ov; s.bowlInns++;
    if(w>=5) s.fiveWkts++;
    if(w>=3) s.threeWkts++;
    // Try to get runs from breakdown directly, or compute from eco if not present
    const ecoM=bd.match(/eco:([\d.]+)/);
    let runsFromBreakdown=bowM[3]?+bowM[3]:null;
    if(runsFromBreakdown===null&&ecoM&&+ecoM[1]>0&&ov>0){
     // Calculate runs from economy: runs = eco * overs (using normalized overs)
     runsFromBreakdown=Math.round(+ecoM[1]*normalizeOvers(ov));
    }
    s.bowlRuns+=(runsFromBreakdown||0);
    if(ecoM&&+ecoM[1]>0){s.ecoStored+=+ecoM[1];s.ecoCount++;}
   }
   const fldM=bd.match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
   if(fldM){s.catches+=+fldM[1];s.stumpings+=+fldM[2];s.runouts+=+fldM[3];}
  });
 });
 // ── Metadata ──
 const meta={};
 if(data.players) Object.values(data.players).forEach(p=>{meta[(p.name||p.n||'').toLowerCase()]={role:p.role||p.r||'',team:p.iplTeam||p.t||''};});
 const ownerMap={},pricePaid={};
 if(data.teams) Object.values(data.teams).forEach(team=>{
  const roster=Array.isArray(team.roster)?team.roster:Object.values(team.roster||{});
  roster.forEach(p=>{const k=(p.name||p.n||'').toLowerCase();ownerMap[k]=team.name;pricePaid[k]=p.soldPrice||0;});
 });
 const all=Object.values(playerTotal);

 // ── Stat definitions ──
 const CATS=[
  {id:'points',label:'\u2B50 Points',subs:[
   {id:'pts-all',label:'Overall',filter:()=>true,sort:(a,b)=>b.pts-a.pts,need:p=>true,
    cols:['#','Player','Owner','Pts','Runs','Wkts'],
    row:p=>([ownerMap[p.name.toLowerCase()]||'--',(p.pts>=0?'+':'')+p.pts,p.runs||'--',p.wkts||'--']),colR:[0,0,0,1,1,1]},
   {id:'pts-bat',label:'Top Batters',filter:p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes('batter'),sort:(a,b)=>b.pts-a.pts,need:p=>p.pts>0,
    cols:['#','Player','Owner','Pts','Runs'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',(p.pts>=0?'+':'')+p.pts,p.runs]),colR:[0,0,0,1,1]},
   {id:'pts-bowl',label:'Top Bowlers',filter:p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes('bowler'),sort:(a,b)=>b.pts-a.pts,need:p=>p.pts>0,
    cols:['#','Player','Owner','Pts','Wkts'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',(p.pts>=0?'+':'')+p.pts,p.wkts]),colR:[0,0,0,1,1]},
   {id:'pts-ar',label:'All-Rounders',filter:p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes('all'),sort:(a,b)=>b.pts-a.pts,need:p=>p.pts>0,
    cols:['#','Player','Owner','Pts','Runs','Wkts'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',(p.pts>=0?'+':'')+p.pts,p.runs,p.wkts]),colR:[0,0,0,1,1,1]},
   {id:'pts-wk',label:'Wicketkeepers',filter:p=>(meta[p.name.toLowerCase()]?.role||'').toLowerCase().includes('wicketkeeper'),sort:(a,b)=>b.pts-a.pts,need:p=>p.pts>0,
    cols:['#','Player','Owner','Pts','Runs','Catches'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',(p.pts>=0?'+':'')+p.pts,p.runs,p.catches]),colR:[0,0,0,1,1,1]},
   {id:'pts-val',label:'Best Value',filter:()=>true,sort:(a,b)=>{const pa=pricePaid[a.name.toLowerCase()]||0;const pb=pricePaid[b.name.toLowerCase()]||0;return(pb>0?b.pts/pb:0)-(pa>0?a.pts/pa:0);},need:p=>(pricePaid[p.name.toLowerCase()]||0)>0&&p.pts>0,
    cols:['#','Player','Owner','Pts/Cr','Pts','Price'],
    row:p=>{const pr=pricePaid[p.name.toLowerCase()]||0;return[ownerMap[p.name.toLowerCase()]||'--',(pr>0?(p.pts/pr).toFixed(1):'--'),(p.pts>=0?'+':'')+p.pts,'\u20B9'+pr.toFixed(1)+'Cr'];},colR:[0,0,0,1,1,1]},
  ]},
  {id:'batting',label:'\uD83C\uDFCF Batting',subs:[
   {id:'bat-runs',label:'Most Runs',filter:()=>true,sort:(a,b)=>b.runs-a.runs,need:p=>p.runs>0,
    cols:['#','Player','Owner','Runs','Balls','SR','4s','6s'],
    row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.runs,p.balls,p.balls>0?((p.runs/p.balls)*100).toFixed(1):'--',p.fours,p.sixes]),colR:[0,0,0,1,1,1,1,1]},
   {id:'bat-hs',label:'Highest Score',filter:()=>true,sort:(a,b)=>b.highScore-a.highScore,need:p=>p.highScore>0,
    cols:['#','Player','Owner','HS','Runs','Inns'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.highScore,p.runs,p.inns]),colR:[0,0,0,1,1,1]},
   {id:'bat-sr',label:'Best Strike Rate',filter:()=>true,sort:(a,b)=>(b.balls>0?b.runs/b.balls:0)-(a.balls>0?a.runs/a.balls:0),need:p=>p.balls>=30,
    cols:['#','Player','Owner','SR','Runs','Balls'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.balls>0?((p.runs/p.balls)*100).toFixed(1):'--',p.runs,p.balls]),colR:[0,0,0,1,1,1]},
   {id:'bat-100',label:'Most Hundreds',filter:()=>true,sort:(a,b)=>b.hundreds-a.hundreds,need:p=>p.hundreds>0,
    cols:['#','Player','Owner','100s','Runs','HS'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.hundreds,p.runs,p.highScore]),colR:[0,0,0,1,1,1]},
   {id:'bat-50',label:'Most Fifties',filter:()=>true,sort:(a,b)=>b.fifties-a.fifties,need:p=>p.fifties>0,
    cols:['#','Player','Owner','50s','Runs','Inns'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.fifties,p.runs,p.inns]),colR:[0,0,0,1,1,1]},
   {id:'bat-90',label:'Most Nineties',filter:()=>true,sort:(a,b)=>b.nineties-a.nineties,need:p=>p.nineties>0,
    cols:['#','Player','Owner','90s','HS','Runs'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.nineties,p.highScore,p.runs]),colR:[0,0,0,1,1,1]},
   {id:'bat-4s',label:'Most Fours',filter:()=>true,sort:(a,b)=>b.fours-a.fours,need:p=>p.fours>0,
    cols:['#','Player','Owner','4s','Runs','Inns'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.fours,p.runs,p.inns]),colR:[0,0,0,1,1,1]},
   {id:'bat-6s',label:'Most Sixes',filter:()=>true,sort:(a,b)=>b.sixes-a.sixes,need:p=>p.sixes>0,
    cols:['#','Player','Owner','6s','Runs','SR'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.sixes,p.runs,p.balls>0?((p.runs/p.balls)*100).toFixed(1):'--']),colR:[0,0,0,1,1,1]},
  ]},
  {id:'bowling',label:'\uD83C\uDFAF Bowling',subs:[
   {id:'bowl-wkts',label:'Most Wickets',filter:()=>true,sort:(a,b)=>b.wkts-a.wkts,need:p=>p.wkts>0,
    cols:['#','Player','Owner','Wkts','Overs','Eco','5W'],
    row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.wkts,p.overs,p.overs>0?(p.bowlRuns/normalizeOvers(p.overs)).toFixed(2):'--',p.fiveWkts||'--']),colR:[0,0,0,1,1,1,1]},
   {id:'bowl-eco',label:'Best Economy (min 6 overs)',filter:()=>true,sort:(a,b)=>{const ea=a.overs>=6?a.bowlRuns/normalizeOvers(a.overs):99;const eb=b.overs>=6?b.bowlRuns/normalizeOvers(b.overs):99;return ea-eb;},need:p=>p.overs>=6,
    cols:['#','Player','Owner','Eco','Overs','Wkts','Runs'],
    row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.overs>0?(p.bowlRuns/normalizeOvers(p.overs)).toFixed(2):'--',p.overs,p.wkts,p.bowlRuns]),colR:[0,0,0,1,1,1,1]},
   {id:'bowl-5w',label:'Most 5-Wicket Hauls',filter:()=>true,sort:(a,b)=>b.fiveWkts-a.fiveWkts,need:p=>p.fiveWkts>0,
    cols:['#','Player','Owner','5W','Wkts','Overs'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.fiveWkts,p.wkts,p.overs]),colR:[0,0,0,1,1,1]},
   {id:'bowl-3w',label:'Most 3-Wicket Hauls',filter:()=>true,sort:(a,b)=>b.threeWkts-a.threeWkts,need:p=>p.threeWkts>0,
    cols:['#','Player','Owner','3W','Wkts','Overs'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.threeWkts,p.wkts,p.overs]),colR:[0,0,0,1,1,1]},
  ]},
  {id:'fielding',label:'\uD83E\uDDE4 Fielding',subs:[
   {id:'fld-dis',label:'Most Dismissals',filter:()=>true,sort:(a,b)=>(b.catches+b.stumpings+b.runouts)-(a.catches+a.stumpings+a.runouts),need:p=>(p.catches+p.stumpings+p.runouts)>0,
    cols:['#','Player','Owner','Dis','Catches','St','RO'],
    row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.catches+p.stumpings+p.runouts,p.catches,p.stumpings,p.runouts]),colR:[0,0,0,1,1,1,1]},
   {id:'fld-c',label:'Most Catches',filter:()=>true,sort:(a,b)=>b.catches-a.catches,need:p=>p.catches>0,
    cols:['#','Player','Owner','Catches','Pts'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.catches,(p.pts>=0?'+':'')+p.pts]),colR:[0,0,0,1,1]},
   {id:'fld-ro',label:'Most Run-outs',filter:()=>true,sort:(a,b)=>b.runouts-a.runouts,need:p=>p.runouts>0,
    cols:['#','Player','Owner','RO','Pts'],row:p=>([ownerMap[p.name.toLowerCase()]||'--',p.runouts,(p.pts>=0?'+':'')+p.pts]),colR:[0,0,0,1,1]},
  ]},
 ];

 // ── State ──
 let activeSub=CATS[0].subs[0].id;
 const sidebar=document.getElementById('anSidebar');
 const grid=document.getElementById('analyticsGrid');
 const titleEl=document.getElementById('anTitle');
 const searchEl=document.getElementById('anSearch');
 if(!grid) return;

 function renderSidebar(){
  sidebar.innerHTML=CATS.map(cat=>{
   const isOpen=cat.subs.some(s=>s.id===activeSub);
   return `<button class="an-cat-btn${isOpen?' an-cat-open':''}" data-cat="${cat.id}"><span>${cat.label}</span><span class="an-cat-arrow">\u25B6</span></button>`+
   `<div class="an-cat-subs">${cat.subs.map(s=>`<button class="an-sub-btn${s.id===activeSub?' an-sub-active':''}" data-sub="${s.id}">${s.label}</button>`).join('')}</div>`;
  }).join('');
  sidebar.querySelectorAll('.an-cat-btn').forEach(btn=>{
   btn.onclick=()=>{
    const wasOpen=btn.classList.contains('an-cat-open');
    sidebar.querySelectorAll('.an-cat-btn').forEach(b=>b.classList.remove('an-cat-open'));
    if(!wasOpen) btn.classList.toggle('an-cat-open');
   };
  });
  sidebar.querySelectorAll('.an-sub-btn').forEach(btn=>{
   btn.onclick=()=>{activeSub=btn.dataset.sub;renderSidebar();renderTable();};
  });
 }

 // Ownership filter dropdown
 var _anFilterEl=document.getElementById('anOwnerFilter');
 if(!_anFilterEl){
  var _anCtrl=searchEl?.parentElement;
  if(_anCtrl){
   _anFilterEl=document.createElement('select');
   _anFilterEl.id='anOwnerFilter';
   _anFilterEl.className='form-select';
   _anFilterEl.style.cssText='width:auto;min-width:140px;margin-left:8px;padding:6px 10px;border-radius:8px;background:var(--surface);color:var(--txt);border:1px solid var(--border);font-size:13px;';
   _anFilterEl.innerHTML='<option value="all">All Players</option><option value="owned">Owned Only</option>';
   _anFilterEl.onchange=function(){renderTable();};
   _anCtrl.appendChild(_anFilterEl);
  }
 }

 function renderTable(){
  let sub=null;
  for(const cat of CATS) for(const s of cat.subs) if(s.id===activeSub){sub=s;break;}
  if(!sub){grid.innerHTML='<div class="an-empty">Select a stat from the sidebar</div>';return;}
  titleEl.textContent=sub.label;
  const q=(searchEl?.value||'').toLowerCase().trim();
  const ownerFilterVal=document.getElementById('anOwnerFilter')?.value||'all';
  let rows=all.filter(sub.filter).filter(sub.need).sort(sub.sort);
  // Apply ownership filter
  if(ownerFilterVal==='owned') rows=rows.filter(p=>!!ownerMap[p.name.toLowerCase()]);
  if(q) rows=rows.filter(p=>p.name.toLowerCase().includes(q)||(ownerMap[p.name.toLowerCase()]||'').toLowerCase().includes(q));
  if(!rows.length){grid.innerHTML='<div class="an-empty">No data'+(q?' matching "'+q+'"':'')+'</div>';return;}
  const hdr=sub.cols.map((c,i)=>`<th${sub.colR[i]?' class="an-th-r"':''}>${c}</th>`).join('');
  const body=rows.map((p,i)=>{
   const vals=sub.row(p);
   const topCls=i===0?' an-top1':i===1?' an-top2':i===2?' an-top3':'';
   return `<tr class="${topCls}"><td class="an-td-idx">${i+1}</td><td class="an-td-name" onclick="window.showPlayerModal('${p.name.replace(/'/g,"\\'")}')">${cbzAvatar(p.name,22)}${p.name}</td>`+
    vals.map((v,vi)=>{
     const cls=vi===0?'an-td-owner':vi===1?'an-td-stat':'an-td-num';
     return `<td class="${cls}">${v}</td>`;
    }).join('')+`</tr>`;
  }).join('');
  grid.innerHTML=`<table class="an-tbl"><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table>`;
 }

 renderSidebar();
 renderTable();
 if(searchEl) searchEl.oninput=()=>renderTable();
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

 // Lookup IPL team for player name
 function getIplTeam(name){
  const nLow=(name||'').toLowerCase().trim();
  const nClean=nLow.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
  if(data.players){
   const pArr=Array.isArray(data.players)?data.players:Object.values(data.players);
   const f=pArr.find(p=>{const pn=(p.name||p.n||'').toLowerCase().trim();return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
   if(f) return (f.iplTeam||f.t||'').toUpperCase();
  }
  const rd=rawData.find(p=>{const pn=(p.n||'').toLowerCase().trim();return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
  return rd?(rd.t||'').toUpperCase():'';
 }

 container.innerHTML=matchIds.map(mid=>{
  const m=matches[mid];
  const players=m.players?Object.entries(m.players):[];
  const resultLabel=m.result==='noresult'?'No Result':m.result==='superover'?'Super Over':'Completed';
  const isOpen=expandedMatches.has(mid);

  // Parse player performances and tag with IPL team
  const batters=[],bowlers=[],fielders=[];
  players.forEach(([pkey,p])=>{
   const bd=p.breakdown||'';
   const team=p.iplTeam||(getIplTeam(p.name));
   const batM=bd.match(/Bat(?:ting)?\((\d+)r\s+([\d.]+)b(?:\s+(\d+)[x\u00d7]4)?(?:\s+(\d+)[x\u00d7]6)?/);
   if(batM) batters.push({name:p.name,team,runs:+batM[1],balls:+batM[2],fours:+(batM[3]||0),sixes:+(batM[4]||0),duck:bd.includes('DUCK'),pts:p.pts});
   const bowM=bd.match(/Bowl(?:ing)?\((\d+)w\s+([\d.]+)ov(?:\s+(\d+)r)?/);
   if(bowM) bowlers.push({name:p.name,team,wkts:+bowM[1],overs:+bowM[2],runs:+(bowM[3]||0),pts:p.pts});
   const fldM=bd.match(/Field(?:ing)?\((\d+)c\s+(\d+)st\s+(\d+)ro\)/);
   if(fldM&&(+fldM[1]||+fldM[2]||+fldM[3])) fielders.push({name:p.name,team,catches:+fldM[1],stumpings:+fldM[2],runouts:+fldM[3],pts:p.pts});
  });

  // Determine the two teams from player data
  const teamSet=new Set([...batters,...bowlers,...fielders].map(p=>p.team).filter(Boolean));
  const teams=[...teamSet];
  const team1=teams[0]||'Team 1';
  const team2=teams[1]||'Team 2';
  const isTeam1=t=>t===team1;

  const sr=p=>p.balls>0?((p.runs/p.balls)*100).toFixed(0):'--';
  const eco=p=>p.overs>0?(p.runs/normalizeOvers(p.overs)).toFixed(2):'--';

  // Styles via CSS classes
  const ptsCls=pts=>pts>0?'md-td-pts-pos':pts<0?'md-td-pts-neg':'md-td-pts-zero';

  function teamSec(label,teamCode){
   return `<div class="md-team-sec md-team-sec-${teamCode}">${label}</div>`;
  }

  function batTable(arr){
   if(!arr.length) return '<div class="md-no-data">No batting data</div>';
   return `<div class="md-overflow"><table class="md-table"><thead><tr>
    <th class="md-th md-th-left">Player</th><th class="md-th md-th-right">R</th><th class="md-th md-th-right">B</th><th class="md-th md-th-right">4s</th><th class="md-th md-th-right">6s</th><th class="md-th md-th-right">SR</th><th class="md-th md-th-right">Pts</th>
   </tr></thead><tbody>${arr.sort((a,b)=>b.runs-a.runs).map(p=>`<tr>
    <td class="md-td md-td-name" onclick="window.showPlayerModal('${p.name.replace(/'/g,"\\'")}')">${p.name}${p.duck?'&nbsp;<span class="md-duck-badge">DUCK</span>':''}</td>
    <td class="md-td md-td-num-bold">${p.runs}</td><td class="md-td md-td-num">${p.balls}</td><td class="md-td md-td-num">${p.fours}</td><td class="md-td md-td-num">${p.sixes}</td><td class="md-td md-td-num">${sr(p)}</td><td class="md-td md-td-pts ${ptsCls(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
   </tr>`).join('')}</tbody></table></div>`;
  }

  function bowlTable(arr){
   if(!arr.length) return '<div class="md-no-data">No bowling data</div>';
   return `<div class="md-overflow"><table class="md-table"><thead><tr>
    <th class="md-th md-th-left">Player</th><th class="md-th md-th-right">Ov</th><th class="md-th md-th-right">R</th><th class="md-th md-th-right">W</th><th class="md-th md-th-right">Eco</th><th class="md-th md-th-right">Pts</th>
   </tr></thead><tbody>${arr.sort((a,b)=>b.wkts-a.wkts).map(p=>`<tr>
    <td class="md-td md-td-name" onclick="window.showPlayerModal('${p.name.replace(/'/g,"\\'")}')">${p.name}</td>
    <td class="md-td md-td-num">${p.overs}</td><td class="md-td md-td-num">${p.runs}</td><td class="md-td md-td-num-bold">${p.wkts}</td><td class="md-td md-td-num">${eco(p)}</td><td class="md-td md-td-pts ${ptsCls(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
   </tr>`).join('')}</tbody></table></div>`;
  }

  function fldTable(arr){
   if(!arr.length) return '';
   return `<div class="md-overflow"><table class="md-table"><thead><tr>
    <th class="md-th md-th-left">Player</th><th class="md-th md-th-right">Catches</th><th class="md-th md-th-right">Stumpings</th><th class="md-th md-th-right">Run-outs</th><th class="md-th md-th-right">Pts</th>
   </tr></thead><tbody>${arr.map(p=>`<tr>
    <td class="md-td md-td-name" onclick="window.showPlayerModal('${p.name.replace(/'/g,"\\'")}')">${p.name}</td>
    <td class="md-td md-td-num">${p.catches}</td><td class="md-td md-td-num">${p.stumpings}</td><td class="md-td md-td-num">${p.runouts}</td><td class="md-td md-td-pts ${ptsCls(p.pts)}">${p.pts>0?'+':''}${p.pts}</td>
   </tr>`).join('')}</tbody></table></div>`;
  }

  // Group by team
  const t1bat=batters.filter(p=>isTeam1(p.team));
  const t2bat=batters.filter(p=>!isTeam1(p.team));
  const t1bowl=bowlers.filter(p=>isTeam1(p.team));
  const t2bowl=bowlers.filter(p=>!isTeam1(p.team));
  const t1fld=fielders.filter(p=>isTeam1(p.team));
  const t2fld=fielders.filter(p=>!isTeam1(p.team));

  const innings=`
   ${teamSec(team1+' — Batting',team1)}${batTable(t1bat)}
   ${teamSec(team1+' — Bowling',team1)}${bowlTable(t1bowl)}
   ${teamSec(team2+' — Batting',team2)}${batTable(t2bat)}
   ${teamSec(team2+' — Bowling',team2)}${bowlTable(t2bowl)}
   ${(t1fld.length||t2fld.length)?teamSec(team1+' — Fielding',team1)+fldTable(t1fld):''}
   ${t2fld.length?teamSec(team2+' — Fielding',team2)+fldTable(t2fld):''}
  `;

  // Points summary — all players sorted
  const allPts=[...Object.values(m.players||{})].sort((a,b)=>(b.pts||0)-(a.pts||0));
  const ptsTable=`<div class="md-pts-summary-hdr"><div class="md-pts-summary-title">Points Summary</div>
   <div class="md-overflow"><table class="md-table"><thead><tr>
    <th class="md-th md-th-left">Player</th><th class="md-th md-th-left">Team</th><th class="md-th md-th-left">Breakdown</th><th class="md-th md-th-right">Pts</th>
   </tr></thead><tbody>${allPts.map(p=>`<tr>
    <td class="md-td md-td-name" onclick="window.showPlayerModal('${(p.name||'').replace(/'/g,"\\'")}')">${p.name||'--'}</td>
    <td class="md-td"><span class="badge bg">${p.iplTeam||getIplTeam(p.name)||'--'}</span></td>
    <td class="md-td md-td-breakdown">${(p.breakdown||'').replace(/ \| /g,' | ')}</td>
    <td class="md-td md-td-pts ${ptsCls(p.pts||0)}">${(p.pts||0)>0?'+':''}${p.pts||0}</td>
   </tr>`).join('')}</tbody></table></div></div>`;

  const deleteBtn=isAdmin?`<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();window.deleteMatch('${escapeHtml(mid)}','${escapeHtml((m.label||mid).replace(/'/g,"\\'"))}')">Delete</button>`:'';
  const _canManage=isAdmin||isSuperAdminEmail(user?.email);
  const snapshotBtn=_canManage?`<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();window.resnapshotMatch('${mid}')" title="Update squad snapshot to current teams">Re-snapshot</button>`:'';
  const metaEditor=isAdmin?`<div class="md-meta-editor">
   <div class="md-meta-field"><span class="md-meta-label">Label</span><input class="edit-input edit-input-label" value="${escapeHtml(m.label||'')}" onblur="window.saveMatchMeta('${escapeHtml(mid)}','label',this.value)"></div>
   <div class="md-meta-field"><span class="md-meta-label">Winner</span><input class="edit-input edit-input-winner" value="${escapeHtml(m.winner||'')}" onblur="window.saveMatchMeta('${escapeHtml(mid)}','winner',this.value.toUpperCase())"></div>
   <div class="md-meta-field"><span class="md-meta-label">MOTM</span><input class="edit-input edit-input-motm" value="${escapeHtml(m.motm||'')}" onblur="window.saveMatchMeta('${escapeHtml(mid)}','motm',this.value)"></div>
  </div>`:'';

  // Total points for each team in this match
  const t1total=allPts.filter(p=>(p.iplTeam||getIplTeam(p.name))===team1).reduce((s,p)=>s+(p.pts||0),0);
  const t2total=allPts.filter(p=>(p.iplTeam||getIplTeam(p.name))===team2).reduce((s,p)=>s+(p.pts||0),0);

  return`<div class="match-block" id="mb_${mid}">
   <div class="match-block-hdr" onclick="window.toggleMatchBlock('${mid}')">
    <div class="lb-info">
     <div class="md-match-hdr-label">${escapeHtml(m.label||mid)}</div>
     <div class="md-match-hdr-tags">
      ${m.winner?`<span class="md-tag md-tag-winner">${escapeHtml(m.winner)} won</span>`:''}
      ${m.motm?`<span class="md-tag md-tag-motm">MOTM: ${escapeHtml(m.motm)}</span>`:''}
      <span class="md-tag md-tag-result">${resultLabel}</span>
      <span class="md-tag-team-pts">${team1}: ${t1total>=0?'+':''}${t1total} | ${team2}: ${t2total>=0?'+':''}${t2total}</span>
     </div>
    </div>
    <div class="md-hdr-actions">
     ${snapshotBtn}${deleteBtn}
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="md-chevron${isOpen?' md-chevron-open':''}"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
   </div>
   <div class="match-body${isOpen?' open':''}" id="mbd_${mid}">
    ${metaEditor}${innings}${ptsTable}
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

// -- Re-snapshot: overwrite a past match's squad snapshot with current team arrangements --
window.resnapshotMatch=function(mid){
 if(!(isAdmin||isSuperAdminEmail(user?.email))||!roomId||!roomState?.teams) return;
 if(!confirm('Update this match\'s squad snapshot to the current team arrangements? This changes how points are counted for this match on the leaderboard.')) return;
 var snaps=buildSquadSnapshots(roomState.teams);
 set(ref(db,`auctions/${roomId}/matches/${mid}/squadSnapshots`),snaps)
 .then(()=>window.showAlert('Squad snapshot updated for this match.','ok'))
 .catch(e=>window.showAlert('Failed: '+e.message));
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
function gscInputStyle(){ return 'padding:8px 10px;font-size:.83rem;background:var(--surface);border:1px solid var(--b1);border-radius:var(--r);color:var(--txt);font-family:var(--f);'; }

window.addGscBattingRow=function(){
 const id=gscBattingCount++;
 const div=document.createElement('div');
 div.id=`gscbr${id}`;
 div.className='sc-row sc-row--gsc';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscbr${id}name" class="sc-input"><input type="number" placeholder="R" id="gscbr${id}runs" min="0" class="sc-input"><input type="number" placeholder="B" id="gscbr${id}balls" min="0" class="sc-input"><input type="number" placeholder="4s" id="gscbr${id}fours" min="0" class="sc-input"><input type="number" placeholder="6s" id="gscbr${id}sixes" min="0" class="sc-input"><select id="gscbr${id}dis" class="sc-input"><option value="out">Out</option><option value="notout">Not Out</option><option value="duck">Duck</option></select><button onclick="document.getElementById('gscbr${id}').remove();gscBattingCount--;" class="btn btn-danger btn-sm sc-remove-btn">Remove</button>`;
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
 div.className='sc-row sc-row--gsc';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscbow${id}name" class="sc-input"><input type="number" placeholder="Ov" id="gscbow${id}overs" min="0" step="0.1" class="sc-input"><input type="number" placeholder="R" id="gscbow${id}runs" min="0" class="sc-input"><input type="number" placeholder="Eco" id="gscbow${id}eco" min="0" step="0.01" class="sc-input"><input type="number" placeholder="W" id="gscbow${id}wkts" min="0" class="sc-input"><input type="number" placeholder="0s" id="gscbow${id}dots" min="0" class="sc-input"><input type="number" placeholder="Mdns" id="gscbow${id}maidens" min="0" class="sc-input"><button onclick="document.getElementById('gscbow${id}').remove();gscBowlingCount--;" class="btn btn-danger btn-sm sc-remove-btn">Remove</button>`;
 document.getElementById('gscBowlingRows').appendChild(div);
};

window.addGscFieldingRow=function(){
 const id=gscFieldingCount++;
 const div=document.createElement('div');
 div.id=`gscfld${id}`;
 div.className='sc-row sc-row--fielding';
 div.innerHTML=`
 <input list="gscDlPlayers" placeholder="Player name" id="gscfld${id}name" class="sc-input"><input type="number" placeholder="Catches" id="gscfld${id}catches" min="0" class="sc-input"><input type="number" placeholder="Stumpings" id="gscfld${id}stumpings" min="0" class="sc-input"><input type="number" placeholder="Run-outs" id="gscfld${id}runouts" min="0" class="sc-input"><button onclick="document.getElementById('gscfld${id}').remove();gscFieldingCount--;" class="btn btn-danger btn-sm sc-remove-btn">Remove</button>`;
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
 // Lookup role helper (uses rawData since global scorecard may not have roomState)
 function _gscLookupRole(name){
 const nLow=name.trim().toLowerCase();
 const nClean=nLow.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
 const rd=rawData.find(p=>{const pn=(p.n||'').toLowerCase().trim();return pn===nLow||pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()===nClean;});
 return rd?(rd.r||''):'';
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
 const _pRole=_gscLookupRole(name);
 const isDuck=(runs===0&&dis==='out')||dis==='duck';
 const pts=calcBattingPoints(runs,balls,fours,sixes,dis,false,isMot,_pRole);
 addP(name,pts,`Bat(${runs}r ${balls}b ${fours}\u00d74 ${sixes}\u00d76${isDuck&&_pRole.toLowerCase()!=='bowler'?' DUCK':''})`);
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
 // Winning team bonus — match scorecard player names against player database
 if(winner){
  // rawData is always available (hardcoded). roomState may not exist on dashboard.
  var _pdb = rawData || [];
  _pdb.forEach(function(p){
   var pnameFull = (p.name || p.n || '').trim().toLowerCase();
   var pnameClean = pnameFull.replace(/\*?\s*\([^)]*\)\s*$/, '').trim();
   var pteam = (p.iplTeam || p.t || '').toUpperCase();
   if(pteam === winner){
    var matched = playerPts[pnameFull] || playerPts[pnameClean];
    if(matched){
     matched.pts += 5;
     matched.breakdown.push('Winning team: +5');
    }
   }
  });
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
 var warningHtml='';
 if(!data.winner){
  warningHtml='<div class="alert alert--warn">⚠ No winning team entered — +5 win bonus NOT included. Fill in the Winning IPL Team field.</div>';
 } else {
  warningHtml='<div class="alert alert--ok">Winner: <strong>'+escapeHtml(data.winner)+'</strong> — +5 bonus applied to '+escapeHtml(data.winner)+' players.</div>';
 }
 content.innerHTML=warningHtml+`<div class="twrap"><table class="preview-table"><thead><tr><th>Player</th><th class="text-right">Points</th><th>Breakdown</th></tr></thead><tbody>${entries.map(e=>`<tr><td class="text-strong">${e.name}</td><td class="text-right pts-cell ${e.pts>=0?'pts-pos':'pts-neg'}">${e.pts>=0?'+':''}${e.pts}</td><td class="text-dim text-sm">${e.breakdown.join(' . ')}</td></tr>`).join('')}</tbody></table></div>`;
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
 // Build owner lookup from rawData (handles name mismatches with * (XX) suffix)
 var _gscOwnerLookup={};
 (rawData||[]).forEach(function(p){
  var fullName=(p.name||p.n||'').trim().toLowerCase();
  var cleanName=fullName.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
  var team=(p.iplTeam||p.t||'').trim();
  _gscOwnerLookup[fullName]=team;
  _gscOwnerLookup[cleanName]=team;
 });
 Object.entries(data.playerPts).forEach(([key,val])=>{
 // key is lowercase clean name from form — sanitize for Firebase (no . # $ / [ ])
 var fbKey=key.replace(/[.#$\/\[\]]/g,'_');
 var iplTeam=_gscOwnerLookup[key]||'';
 matchRecord.players[fbKey]={name:val.name,pts:val.pts,breakdown:val.breakdown.join(' | '),ownedBy:'',iplTeam:iplTeam};
 });

 try{
 // 1. Save to user's global scorecard store (source of truth)
 await set(ref(db,`users/${user.uid}/scorecards/${matchId}`),matchRecord);

 // 2. Fan-out: get all owned AND joined auction rooms
 const [aSnap,dSnap,jSnap,jdSnap]=await Promise.all([
 get(ref(db,`users/${user.uid}/auctions`)),
 get(ref(db,`users/${user.uid}/drafts`)),
 get(ref(db,`users/${user.uid}/joined`)),
 get(ref(db,`users/${user.uid}/joinedDrafts`))
 ]);

 const fanOutWrites={};
 const aRooms=aSnap.val()||{};
 const dRooms=dSnap.val()||{};
 const jRooms=jSnap.val()||{};
 const jdRooms=jdSnap.val()||{};

 // Merge: owned auctions + joined auctions (deduplicate by rid)
 const allAuctionRids=new Set([...Object.keys(aRooms),...Object.keys(jRooms)]);
 const allDraftRids=new Set([...Object.keys(dRooms),...Object.keys(jdRooms)]);

 // Duplicate detection: check if a match with the same label already exists in any room
 // If found, delete old match entries to prevent double-counting
 const dupCleanPromises=[];
 const matchLabel=data.label.toLowerCase().trim();
 allAuctionRids.forEach(rid=>{
  dupCleanPromises.push(get(ref(db,`auctions/${rid}/matches`)).then(mSnap=>{
   var matches=mSnap.val()||{};
   var delWrites={};
   Object.entries(matches).forEach(function(me){
    if((me[1].label||'').toLowerCase().trim()===matchLabel){
     delWrites[`auctions/${rid}/matches/${me[0]}`]=null; // delete old duplicate
    }
   });
   if(Object.keys(delWrites).length>0) return update(ref(db),delWrites);
  }).catch(()=>{}));
 });
 allDraftRids.forEach(rid=>{
  dupCleanPromises.push(get(ref(db,`drafts/${rid}/matches`)).then(mSnap=>{
   var matches=mSnap.val()||{};
   var delWrites={};
   Object.entries(matches).forEach(function(me){
    if((me[1].label||'').toLowerCase().trim()===matchLabel){
     delWrites[`drafts/${rid}/matches/${me[0]}`]=null; // delete old duplicate
    }
   });
   if(Object.keys(delWrites).length>0) return update(ref(db),delWrites);
  }).catch(()=>{}));
 });
 await Promise.all(dupCleanPromises);

 allAuctionRids.forEach(rid=>{
 fanOutWrites[`auctions/${rid}/matches/${matchId}`]=matchRecord;
 });
 allDraftRids.forEach(rid=>{
 fanOutWrites[`drafts/${rid}/matches/${matchId}`]=matchRecord;
 });

 const totalRooms=allAuctionRids.size+allDraftRids.size;

 if(totalRooms>0){
 await update(ref(db),fanOutWrites);
 // Post-push: enrich each room's match with inActiveSquad flags + snapshots + leaderboard totals
 const enrichPromises=[];
 allAuctionRids.forEach(rid=>{
  enrichPromises.push(get(ref(db,`auctions/${rid}`)).then(roomSnap=>{
   const roomData=roomSnap.val()||{};
   const teams=roomData.teams||{};
   const ownerMap={},squadMap={};
   Object.values(teams).forEach(t=>{
    const roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
    roster.forEach(p=>{
     var fn=(p.name||p.n||'').toLowerCase().trim();
     var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
     ownerMap[fn]=t.name;
     ownerMap[cn]=t.name;
    });
    const sq=t.activeSquad||null;
    if(sq&&Array.isArray(sq)){
     var sSet=new Set();
     sq.forEach(n=>{sSet.add(n.toLowerCase().trim());sSet.add(n.toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
     squadMap[t.name]=sSet;
    } else {
     var sSet2=new Set();
     roster.forEach(p=>{var fn2=(p.name||p.n||'').toLowerCase().trim();sSet2.add(fn2);sSet2.add(fn2.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
     squadMap[t.name]=sSet2;
    }
   });
   const upd={};
   Object.entries(matchRecord.players).forEach(([k,p])=>{
    const pn=(p.name||'').toLowerCase().trim();
    const owner=ownerMap[pn]||ownerMap[pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()]||'';
    const inSquad=owner&&squadMap[owner]?squadMap[owner].has(pn):false;
    upd[`auctions/${rid}/matches/${matchId}/players/${k}/ownedBy`]=owner;
    upd[`auctions/${rid}/matches/${matchId}/players/${k}/inActiveSquad`]=inSquad;
   });
   // Save squad snapshots
   var snaps=buildSquadSnapshots(teams);
   Object.entries(snaps).forEach(([tn,snap])=>{
    upd[`auctions/${rid}/matches/${matchId}/squadSnapshots/${tn}`]=snap;
   });
   // Recalculate leaderboard totals from scratch (prevents double-counting from duplicates)
   var xiMult=parseFloat(roomData.xiMultiplier)||1;
   var allMatches=roomData.matches||{};
   // The new match isn't in allMatches yet (it was written separately), add it
   allMatches[matchId]=matchRecord;
   // Also apply the enriched snapshots we just computed
   if(!allMatches[matchId].squadSnapshots) allMatches[matchId].squadSnapshots={};
   Object.entries(snaps).forEach(([tn2,snap2])=>{allMatches[matchId].squadSnapshots[tn2]=snap2;});
   var totals={};
   Object.values(teams).forEach(function(t2){totals[t2.name]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};});
   Object.entries(allMatches).forEach(function(me2){
    var m2=me2[1]; if(!m2?.players) return;
    var mSnaps2=m2.squadSnapshots||snaps;
    var c2=computeMatchContribution(m2, mSnaps2, teams, xiMult);
    Object.entries(c2).forEach(function(ce2){
     var tn3=ce2[0], cc=ce2[1];
     if(!totals[tn3]) totals[tn3]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};
     totals[tn3].pts+=cc.pts;
     Object.entries(cc.players).forEach(function(pe){totals[tn3]._players[pe[0]]=(totals[tn3]._players[pe[0]]||0)+pe[1];});
    });
   });
   var storedNew={};
   Object.entries(totals).forEach(function(te){
    var tn4=te[0], tt=te[1]; var topP='--',topPts=0,pCount=0;
    Object.entries(tt._players).forEach(function(pe){if(pe[1]!==0)pCount++;if(pe[1]>topPts){topPts=pe[1];topP=pe[0];}});
    storedNew[tn4]={pts:Math.round(tt.pts*100)/100,topPlayer:topP,topPts:Math.round(topPts*100)/100,playerCount:pCount};
   });
   upd[`auctions/${rid}/leaderboardTotals`]=storedNew;
   if(Object.keys(upd).length) return update(ref(db),upd);
  }).catch(()=>{}));
 });
 allDraftRids.forEach(rid=>{
  enrichPromises.push(get(ref(db,`drafts/${rid}`)).then(roomSnap=>{
   const roomData=roomSnap.val()||{};
   const teams=roomData.teams||{};
   const ownerMap={},squadMap={};
   Object.values(teams).forEach(t=>{
    const roster=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
    roster.forEach(p=>{
     var fn=(p.name||p.n||'').toLowerCase().trim();
     var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
     ownerMap[fn]=t.name;
     ownerMap[cn]=t.name;
    });
    const sq=t.activeSquad||null;
    if(sq&&Array.isArray(sq)){
     var sSet=new Set();
     sq.forEach(n=>{sSet.add(n.toLowerCase().trim());sSet.add(n.toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
     squadMap[t.name]=sSet;
    } else {
     var sSet2=new Set();
     roster.forEach(p=>{var fn2=(p.name||p.n||'').toLowerCase().trim();sSet2.add(fn2);sSet2.add(fn2.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});
     squadMap[t.name]=sSet2;
    }
   });
   const upd={};
   Object.entries(matchRecord.players).forEach(([k,p])=>{
    const pn=(p.name||'').toLowerCase().trim();
    const owner=ownerMap[pn]||ownerMap[pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()]||'';
    const inSquad=owner&&squadMap[owner]?squadMap[owner].has(pn):false;
    upd[`drafts/${rid}/matches/${matchId}/players/${k}/ownedBy`]=owner;
    upd[`drafts/${rid}/matches/${matchId}/players/${k}/inActiveSquad`]=inSquad;
   });
   // Save squad snapshots
   var snaps=buildSquadSnapshots(teams);
   Object.entries(snaps).forEach(([tn,snap])=>{
    upd[`drafts/${rid}/matches/${matchId}/squadSnapshots/${tn}`]=snap;
   });
   // Recalculate leaderboard totals from scratch (prevents double-counting)
   var xiMult=parseFloat(roomData.xiMultiplier)||1;
   var allMatches=roomData.matches||{};
   allMatches[matchId]=matchRecord;
   if(!allMatches[matchId].squadSnapshots) allMatches[matchId].squadSnapshots={};
   Object.entries(snaps).forEach(([tn2,snap2])=>{allMatches[matchId].squadSnapshots[tn2]=snap2;});
   var totals={};
   Object.values(teams).forEach(function(t2){totals[t2.name]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};});
   Object.entries(allMatches).forEach(function(me2){
    var m2=me2[1]; if(!m2?.players) return;
    var mSnaps2=m2.squadSnapshots||snaps;
    var c2=computeMatchContribution(m2, mSnaps2, teams, xiMult);
    Object.entries(c2).forEach(function(ce2){
     var tn3=ce2[0], cc=ce2[1];
     if(!totals[tn3]) totals[tn3]={pts:0,topPlayer:'--',topPts:0,playerCount:0,_players:{}};
     totals[tn3].pts+=cc.pts;
     Object.entries(cc.players).forEach(function(pe){totals[tn3]._players[pe[0]]=(totals[tn3]._players[pe[0]]||0)+pe[1];});
    });
   });
   var storedNew={};
   Object.entries(totals).forEach(function(te){
    var tn4=te[0], tt=te[1]; var topP='--',topPts=0,pCount=0;
    Object.entries(tt._players).forEach(function(pe){if(pe[1]!==0)pCount++;if(pe[1]>topPts){topPts=pe[1];topP=pe[0];}});
    storedNew[tn4]={pts:Math.round(tt.pts*100)/100,topPlayer:topP,topPts:Math.round(topPts*100)/100,playerCount:pCount};
   });
   upd[`drafts/${rid}/leaderboardTotals`]=stored;
   if(Object.keys(upd).length) return update(ref(db),upd);
  }).catch(()=>{}));
 });
 await Promise.all(enrichPromises);
 }

 statusEl.className='ai-status done';
 statusEl.textContent=`"${data.label}" saved and pushed to ${totalRooms} room${totalRooms===1?'':'s'} (${allAuctionRids.size} auction · ${allDraftRids.size} draft).`;

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
 if(!data){list.innerHTML='<div class="empty">No matches saved yet.</div>';return;}
 const entries=Object.entries(data).sort((a,b)=>(b[1].timestamp||0)-(a[1].timestamp||0));
 list.innerHTML=entries.map(([mid,m])=>{
 const playerCount=m.players?Object.keys(m.players).length:0;
 const topPlayer=m.players?Object.values(m.players).sort((a,b)=>(b.pts||0)-(a.pts||0))[0]:null;
 const resultLabel=m.result==='noresult'?'No Result':m.result==='superover'?'Super Over':'Completed';
 return`<div class="gsc-history-row"><div><div class="gsc-history-label">${escapeHtml(m.label||mid)}</div><div class="text-dim text-sm mt-2">${m.winner?`Winner: <strong>${escapeHtml(m.winner)}</strong>. `:''}${m.motm?`MOTM: ${escapeHtml(m.motm)} . `:''}${resultLabel} . ${playerCount} players scored${topPlayer?` . Top: <strong>${escapeHtml(topPlayer.name)}</strong>(${topPlayer.pts>=0?'+':''}${topPlayer.pts} pts)`:''}</div></div><div class="btn-group"><button class="btn btn-ghost btn-sm" onclick="window.repushScorecard('${escapeHtml(mid)}')">Re-push</button><button class="btn btn-danger btn-sm" onclick="window.deleteGlobalScorecard('${escapeHtml(mid)}','${escapeHtml((m.label||mid).replace(/'/g,"\\'"))}')">Delete</button></div></div>`;
 }).join('');
 }).catch(e=>{ list.innerHTML=`<div class="empty">Error loading: ${e.message}</div>`; });
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
 if(roomsList) roomsList.innerHTML='<div class="empty">Loading all rooms...</div>';

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
 roomsList.innerHTML='<div class="empty">No rooms found on platform.</div>';
 return;
 }

 const makeRoomRow=(rid,r,type)=>`
 <div class="sa-room-row"><div><div class="sa-room-name"><span class="text-strong">${r.name||r.roomName||rid}</span><span class="room-type-pill ${type}">${type==='auction'?'Auction':'Draft'}</span></div><div class="text-dim text-xs mt-2">ID: <code class="code-pill">${rid}</code>${r._ownerUid?' . Owner: '+r._ownerUid.substring(0,8)+'...':''}${r.createdAt?' . '+new Date(r.createdAt).toLocaleDateString():''}</div></div><div class="btn-group"><button class="btn btn-ghost btn-sm" onclick="window.saViewRoom('${rid}','${type}')">View</button><button class="btn btn-danger btn-sm" onclick="window.saDeleteRoom('${rid}','${type}','${(r.name||r.roomName||rid).replace(/'/g,"\\'")}')">Delete</button></div></div>`;

 roomsList.innerHTML=
 `<div class="sa-section-hdr">Auction Rooms (${aEntries.length})</div>`+
 (aEntries.length?aEntries.map(([rid,r])=>makeRoomRow(rid,r,'auction')).join(''):'<div class="empty">No auction rooms.</div>')+
 `<div class="sa-section-hdr">Draft Rooms (${dEntries.length})</div>`+
 (dEntries.length?dEntries.map(([rid,r])=>makeRoomRow(rid,r,'draft')).join(''):'<div class="empty">No draft rooms.</div>');

 }catch(e){
 if(roomsList) roomsList.innerHTML=`<div class="empty text-err">Error: ${e.message}</div>`;
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
 const scSnap=await get(ref(db,`users/${user.uid}/scorecards/${mid}`));
 if(!scSnap.exists()){statusEl.className='ai-status fail';statusEl.textContent='\u274c Scorecard not found.';return;}
 const matchRecord=scSnap.val();

 const usersSnap=await get(ref(db,'users'));
 const usersData=usersSnap.val()||{};

 const auctionRids=new Set(), draftRids=new Set();
 Object.values(usersData).forEach(udata=>{
  if(udata.auctions) Object.keys(udata.auctions).forEach(rid=>auctionRids.add(rid));
  if(udata.drafts) Object.keys(udata.drafts).forEach(rid=>draftRids.add(rid));
  if(udata.joined) Object.keys(udata.joined).forEach(rid=>auctionRids.add(rid));
  if(udata.joinedDrafts) Object.keys(udata.joinedDrafts).forEach(rid=>draftRids.add(rid));
 });

 if(!auctionRids.size&&!draftRids.size){
 statusEl.className='ai-status fail';
 statusEl.textContent='No rooms found on the platform.';
 return;
 }

 const fanOut={};
 auctionRids.forEach(rid=>{fanOut[`auctions/${rid}/matches/${mid}`]=matchRecord;});
 draftRids.forEach(rid=>{fanOut[`drafts/${rid}/matches/${mid}`]=matchRecord;});
 await update(ref(db),fanOut);

 statusEl.textContent=' Saving snapshots and updating leaderboard totals...';
 var postPromises=[];
 auctionRids.forEach(function(rid){
  postPromises.push(get(ref(db,'auctions/'+rid)).then(function(roomSnap){
   var roomData=roomSnap.val()||{};
   var teams=roomData.teams||{};
   var snaps=buildSquadSnapshots(teams);
   var upd={};
   Object.entries(snaps).forEach(function(se){upd['auctions/'+rid+'/matches/'+mid+'/squadSnapshots/'+se[0]]=se[1];});
   // Enrich ownedBy
   var oMap={},sMap={};
   Object.values(teams).forEach(function(t){
    var r2=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
    r2.forEach(function(p){var fn=(p.name||p.n||'').toLowerCase().trim();var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();oMap[fn]=t.name;oMap[cn]=t.name;});
    var sq2=t.activeSquad||null;
    if(sq2&&Array.isArray(sq2)){var ss=new Set();sq2.forEach(function(n){ss.add(n.toLowerCase().trim());ss.add(n.toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});sMap[t.name]=ss;}
    else{var ss2=new Set();r2.forEach(function(p){var fn2=(p.name||p.n||'').toLowerCase().trim();ss2.add(fn2);ss2.add(fn2.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});sMap[t.name]=ss2;}
   });
   Object.entries(matchRecord.players||{}).forEach(function(pe){
    var k=pe[0],p=pe[1];var pn=(p.name||'').toLowerCase().trim();
    var ow=oMap[pn]||oMap[pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()]||'';
    upd['auctions/'+rid+'/matches/'+mid+'/players/'+k+'/ownedBy']=ow;
    upd['auctions/'+rid+'/matches/'+mid+'/players/'+k+'/inActiveSquad']=ow&&sMap[ow]?sMap[ow].has(pn):false;
   });
   var xiMult=parseFloat(roomData.xiMultiplier)||1;
   var contrib=computeMatchContribution(matchRecord, snaps, teams, xiMult);
   var stored=roomData.leaderboardTotals||{};
   Object.entries(contrib).forEach(function(ce){
    var tn=ce[0],c=ce[1];
    if(!stored[tn]) stored[tn]={pts:0,topPlayer:'--',topPts:0,playerCount:0};
    stored[tn].pts=Math.round((stored[tn].pts+c.pts)*100)/100;
    var bestN='--',bestP=0,pC=0;
    Object.entries(c.players).forEach(function(pe2){if(pe2[1]!==0)pC++;if(pe2[1]>bestP){bestP=pe2[1];bestN=pe2[0];}});
    stored[tn].playerCount=(stored[tn].playerCount||0)+pC;
    if(bestP>stored[tn].topPts){stored[tn].topPts=bestP;stored[tn].topPlayer=bestN;}
   });
   upd['auctions/'+rid+'/leaderboardTotals']=stored;
   return update(ref(db),upd);
  }).catch(function(){}));
 });
 draftRids.forEach(function(rid){
  postPromises.push(get(ref(db,'drafts/'+rid)).then(function(roomSnap){
   var roomData=roomSnap.val()||{};
   var teams=roomData.teams||{};
   var snaps=buildSquadSnapshots(teams);
   var upd={};
   Object.entries(snaps).forEach(function(se){upd['drafts/'+rid+'/matches/'+mid+'/squadSnapshots/'+se[0]]=se[1];});
   var oMap={},sMap={};
   Object.values(teams).forEach(function(t){
    var r2=Array.isArray(t.roster)?t.roster:(t.roster?Object.values(t.roster):[]);
    r2.forEach(function(p){var fn=(p.name||p.n||'').toLowerCase().trim();var cn=fn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();oMap[fn]=t.name;oMap[cn]=t.name;});
    var sq2=t.activeSquad||null;
    if(sq2&&Array.isArray(sq2)){var ss=new Set();sq2.forEach(function(n){ss.add(n.toLowerCase().trim());ss.add(n.toLowerCase().trim().replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});sMap[t.name]=ss;}
    else{var ss2=new Set();r2.forEach(function(p){var fn2=(p.name||p.n||'').toLowerCase().trim();ss2.add(fn2);ss2.add(fn2.replace(/\*?\s*\([^)]*\)\s*$/,'').trim());});sMap[t.name]=ss2;}
   });
   Object.entries(matchRecord.players||{}).forEach(function(pe){
    var k=pe[0],p=pe[1];var pn=(p.name||'').toLowerCase().trim();
    var ow=oMap[pn]||oMap[pn.replace(/\*?\s*\([^)]*\)\s*$/,'').trim()]||'';
    upd['drafts/'+rid+'/matches/'+mid+'/players/'+k+'/ownedBy']=ow;
    upd['drafts/'+rid+'/matches/'+mid+'/players/'+k+'/inActiveSquad']=ow&&sMap[ow]?sMap[ow].has(pn):false;
   });
   var xiMult=parseFloat(roomData.xiMultiplier)||1;
   var contrib=computeMatchContribution(matchRecord, snaps, teams, xiMult);
   var stored=roomData.leaderboardTotals||{};
   Object.entries(contrib).forEach(function(ce){
    var tn=ce[0],c=ce[1];
    if(!stored[tn]) stored[tn]={pts:0,topPlayer:'--',topPts:0,playerCount:0};
    stored[tn].pts=Math.round((stored[tn].pts+c.pts)*100)/100;
    var bestN='--',bestP=0,pC=0;
    Object.entries(c.players).forEach(function(pe2){if(pe2[1]!==0)pC++;if(pe2[1]>bestP){bestP=pe2[1];bestN=pe2[0];}});
    stored[tn].playerCount=(stored[tn].playerCount||0)+pC;
    if(bestP>stored[tn].topPts){stored[tn].topPts=bestP;stored[tn].topPlayer=bestN;}
   });
   upd['drafts/'+rid+'/leaderboardTotals']=stored;
   return update(ref(db),upd);
  }).catch(function(){}));
 });
 await Promise.all(postPromises);

 statusEl.className='ai-status done';
 statusEl.textContent=`"${matchRecord.label}" pushed to ${auctionRids.size} auction + ${draftRids.size} draft rooms. Leaderboard totals updated.`;

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
 infoText.innerHTML=`<strong class="text-accent">${escapeHtml(m.label||mid)}</strong>&nbsp;.&nbsp; Winner: ${escapeHtml(m.winner||'--')} &nbsp;.&nbsp; MOTM: ${escapeHtml(m.motm||'--')} &nbsp;.&nbsp; ${playerCount} players scored`;
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
 const isLight=document.body.classList.toggle('light');
 localStorage.setItem('ipl-theme',isLight?'light':'dark');
 const b=document.getElementById('darkToggle');
 if(b) b.innerHTML=isLight?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
};
(function(){
 if(localStorage.getItem('ipl-theme')==='light'){
  document.body.classList.add('light');
  document.addEventListener('DOMContentLoaded',function(){
   const b=document.getElementById('darkToggle');
   if(b)b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
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
    const auctionIds=new Set();
    const draftIds=new Set();
    Object.values(users).forEach(u=>{
      if(u.auctions) Object.keys(u.auctions).forEach(rid=>auctionIds.add(rid));
      if(u.drafts) Object.keys(u.drafts).forEach(rid=>draftIds.add(rid));
    });
    sel.innerHTML='<option value="">-- Select a room --</option>';
    for(const rid of auctionIds){
      const nameSnap=await get(ref(db,`auctions/${rid}/roomName`));
      const name=nameSnap.val()||`Room ${rid.substring(0,6)}`;
      const osSnap=await get(ref(db,`auctions/${rid}/maxOverseas`));
      const curOs=osSnap.val()??8;
      const o=document.createElement('option');
      o.value='auction:'+rid;
      o.textContent=`[Auction] ${name} (limit: ${curOs})`;
      sel.appendChild(o);
    }
    for(const rid of draftIds){
      const nameSnap=await get(ref(db,`drafts/${rid}/roomName`));
      const name=nameSnap.val()||`Draft ${rid.substring(0,6)}`;
      const osSnap=await get(ref(db,`drafts/${rid}/maxOverseas`));
      const curOs=osSnap.val()??8;
      const o=document.createElement('option');
      o.value='draft:'+rid;
      o.textContent=`[Draft] ${name} (limit: ${curOs})`;
      sel.appendChild(o);
    }
  }catch(e){console.error('saPopulateOsRooms:',e);}
};

window.saSetOverseasLimit=async function(){
  const raw=document.getElementById('saOsRoomSelect')?.value||'';
  const limit=parseInt(document.getElementById('saOsLimit')?.value)||8;
  const st=document.getElementById('saOsStatus');
  if(!raw){if(st){st.className='ai-status fail';st.textContent='Select a room first.';}return;}
  if(limit<1||limit>15){if(st){st.className='ai-status fail';st.textContent='Limit must be 1-15.';}return;}
  if(st){st.className='ai-status parsing';st.textContent='Applying...';}
  // Parse "auction:rid" or "draft:rid"
  const parts=raw.split(':');
  const type=parts[0];
  const rid=parts.slice(1).join(':');
  const basePath=type==='draft'?'drafts':'auctions';
  try{
    const upd={};
    upd[`${basePath}/${rid}/maxOverseas`]=limit;
    upd[`${basePath}/${rid}/setup/maxOverseas`]=limit;
    await update(ref(db),upd);
    if(st){st.className='ai-status done';st.textContent=`Overseas limit set to ${limit} for ${type} room — takes effect immediately.`;}
    await window.saPopulateOsRooms();
  }catch(e){if(st){st.className='ai-status fail';st.textContent=`\u274c ${e.message}`;}}
};

// -- SA: XI Multiplier Tool --
window.saPopulateMultRooms=async function(){
  const sel=document.getElementById('saMultRoomSelect');
  if(!sel) return;
  try{
    const usersSnap=await get(ref(db,'users'));
    const users=usersSnap.val()||{};
    const auctionIds=new Set();
    const draftIds=new Set();
    Object.values(users).forEach(u=>{
      if(u.auctions) Object.keys(u.auctions).forEach(rid=>auctionIds.add(rid));
      if(u.drafts) Object.keys(u.drafts).forEach(rid=>draftIds.add(rid));
    });
    sel.innerHTML='<option value="">-- Select a room --</option>';
    for(const rid of auctionIds){
      const nameSnap=await get(ref(db,`auctions/${rid}/roomName`));
      const name=nameSnap.val()||`Room ${rid.substring(0,6)}`;
      const multSnap=await get(ref(db,`auctions/${rid}/xiMultiplier`));
      const curMult=multSnap.val()??1;
      const o=document.createElement('option');
      o.value='auction:'+rid;
      o.textContent=`[Auction] ${name} (XI: ${curMult}x)`;
      sel.appendChild(o);
    }
    for(const rid of draftIds){
      const nameSnap=await get(ref(db,`drafts/${rid}/roomName`));
      const name2=nameSnap.val()||`Draft ${rid.substring(0,6)}`;
      const multSnap2=await get(ref(db,`drafts/${rid}/xiMultiplier`));
      const curMult2=multSnap2.val()??1;
      const o2=document.createElement('option');
      o2.value='draft:'+rid;
      o2.textContent=`[Draft] ${name2} (XI: ${curMult2}x)`;
      sel.appendChild(o2);
    }
  }catch(e){console.error('saPopulateMultRooms:',e);}
};

window.saSetXIMultiplier=async function(){
  const raw=document.getElementById('saMultRoomSelect')?.value||'';
  const mult=parseFloat(document.getElementById('saMultValue')?.value);
  const st=document.getElementById('saMultStatus');
  if(!raw){if(st){st.className='ai-status fail';st.textContent='Select a room first.';}return;}
  if(isNaN(mult)||mult<0.5||mult>5){if(st){st.className='ai-status fail';st.textContent='Multiplier must be between 0.5 and 5.';}return;}
  if(st){st.className='ai-status parsing';st.textContent='Applying...';}
  const parts=raw.split(':');
  const type=parts[0];
  const rid=parts.slice(1).join(':');
  const basePath=type==='draft'?'drafts':'auctions';
  try{
    await set(ref(db,`${basePath}/${rid}/xiMultiplier`),mult);
    if(st){st.className='ai-status done';st.textContent=`XI multiplier set to ${mult}x for ${type} room. Leaderboard will recalculate automatically.`;}
    await window.saPopulateMultRooms();
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
  const matchHeaders=sortedMatches.map(([mid,m],i)=>`<th>M${i+1}<div class="pst-match-label" title="${escapeHtml(m.label||mid)}">${escapeHtml((m.label||mid).substring(0,12)+(m.label&&m.label.length>12?'...':''))}</div></th>`).join('');

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
        <td><span class="pname-cell">${cbzAvatar(p.name||p.n,24)}${p.name||p.n||'--'}${iplTeam?`<span class="pst-iplteam">${iplTeam}</span>`:''}${isOs?'<span class="pst-os">OS</span>':''}</span></td>
        ${cells}
        <td class="pst-total-cell">+${total}</td>
      </tr>`;
    }).join('');

    return `<div class="pst-team-section">
      <div class="pst-team-hdr">
        <span class="pst-team-name">${team.name}</span>
        <span class="pst-owner">${roster.length} players</span>
        <span class="ml-auto text-ok text-sm text-strong">Total: +${teamTotal} pts</span>
      </div>
      <div class="pst-wrap"><table class="pst-table">
        <thead><tr><th>Player</th>${matchHeaders}<th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </div>`;
  }).join('');
}


// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// ═══════════════════════════════════════════════════════════════════
// IPL 2026 — STATIC DATA (zero API calls — baked in at build time)
// Player imageIds from Cricbuzz: https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c{id}/i.jpg
// ═══════════════════════════════════════════════════════════════════
const IPL_SERIES_ID = 9241;
const IPL_TEAM_META = {
  CSK:  {logoImgId:860038, color:'#FCBE03', full:'Chennai Super Kings'},
  DC:   {logoImgId:860040, color:'#282968', full:'Delhi Capitals'},
  GT:   {logoImgId:860068, color:'#1C1C1C', full:'Gujarat Titans'},
  RCB:  {logoImgId:860056, color:'#EC1C24', full:'Royal Challengers Bengaluru'},
  PBKS: {logoImgId:860084, color:'#A72056', full:'Punjab Kings'},
  KKR:  {logoImgId:860046, color:'#3A225D', full:'Kolkata Knight Riders'},
  SRH:  {logoImgId:860066, color:'#F7A721', full:'Sunrisers Hyderabad'},
  RR:   {logoImgId:860055, color:'#2D4FA3', full:'Rajasthan Royals'},
  LSG:  {logoImgId:882545, color:'#A5CFEF', full:'Lucknow Super Giants'},
  MI:   {logoImgId:860053, color:'#004BA0', full:'Mumbai Indians'},
};
// Normalized player name → Cricbuzz imageId (174146 = generic placeholder)
const CBZ_PLAYER_IMG = {
  "ruturaj gaikwad":781069,"ms dhoni":170677,"dewald brevis":846104,"ayush mhatre":826116,
  "anshul kamboj":731465,"jamie overton":848546,"ramakrishna ghosh":781087,"shivam dube":846034,
  "khaleel ahmed":655386,"noor ahmad":616569,"mukesh choudhary":781085,"shreyas gopal":226505,
  "sanju samson":846035,"akeal hosein":845497,"matthew short":619877,"sarfaraz khan":591955,
  "rahul chahar":226225,"matt henry":845495,"zakary foulkes":829852,"zak foulkes":829852,
  "spencer johnson":619884,"kl rahul":616523,"karun nair":717781,"tristan stubbs":846116,
  "axar patel":846033,"mitchell starc":352462,"t natarajan":198676,"t. natarajan":198676,
  "dushmantha chameera":847167,"kuldeep yadav":846039,"nitish rana":171047,
  "ben duckett":845942,"david miller":846103,"pathum nissanka":847160,"lungi ngidi":846112,
  "prithvi shaw":781077,"kyle jamieson":845508,"shubman gill":616515,"sai sudharsan":717782,
  "kumar kushagra":594227,"anuj rawat":226472,"jos buttler":848523,"nishant sindhu":594229,
  "glenn phillips":845521,"washington sundar":616522,"shahrukh khan":226465,
  "rahul tewatia":196288,"kagiso rabada":846108,"mohammed siraj":591952,
  "prasidh krishna":591958,"ishant sharma":154520,"rashid khan":845423,"sai kishore":226507,
  "ravisrinivasan sai kishore":226507,"jayant yadav":226388,"jason holder":845501,
  "tom banton":848526,"luke wood":848539,"ajinkya rahane":332892,"rinku singh":846030,
  "angkrish raghuvanshi":626309,"manish pandey":171022,"rovman powell":845516,
  "anukul roy":593785,"sunil narine":152654,"varun chakaravarthy":846040,"umran malik":594197,
  "cameron green":845943,"matheesha pathirana":847143,"finn allen":845498,
  "prashant solanki":788083,"kartik tyagi":593781,"rahul tripathi":788087,
  "tim seifert":845504,"rachin ravindra":845519,"blessing muzarabani":847098,
  "navdeep saini":226400,"rishabh pant":616524,"abdul samad":226276,"aiden markram":846099,
  "matthew breetzke":597838,"nicholas pooran":244722,"mitchell marsh":845760,
  "shahbaz ahmed":226473,"shahbaz ahamad":226473,"arshin kulkarni":781896,
  "avesh khan":593807,"arjun tendulkar":154048,"mohammed shami":616526,
  "anrich nortje":846100,"wanindu hasaranga":847146,"josh inglis":845950,
  "rohit sharma":616514,"suryakumar yadav":846028,"surya kumar yadav":846028,
  "ryan rickelton":846115,"tilak varma":846029,"hardik pandya":846032,
  "mitchell santner":845505,"will jacks":848529,"corbin bosch":846101,"raj bawa":226295,
  "trent boult":351612,"jasprit bumrah":846037,"deepak chahar":226392,
  "am ghazanfar":737997,"allah ghazanfar":737997,"mayank markande":226510,
  "shardul thakur":352487,"sherfane rutherford":845523,"quinton de kock":846114,
  "shreyas iyer":616518,"harnoor singh":226292,"harnoor pannu":226292,
  "prabhsimran singh":226515,"marcus stoinis":845974,"harpreet brar":226471,
  "marco jansen":846113,"azmatullah omarzai":845424,"musheer khan":581691,
  "mitchell owen":719474,"mitch owen":719474,"arshdeep singh":846038,
  "yuzvendra chahal":244981,"vijaykumar vyshak":594320,"vyshak vijaykumar":594320,
  "xavier bartlett":845954,"lockie ferguson":845492,"cooper connolly":845942,
  "ben dwarshuis":845955,"praveen dubey":195872,"pravin dubey":195872,
  "vaibhav sooryavanshi":826114,"vaibhav suryavanshi":826114,
  "lhuan-dre pretorius":735979,"shimron hetmyer":846142,"yashasvi jaiswal":591942,
  "dhruv jurel":591954,"riyan parag":156160,"jofra archer":848536,
  "tushar deshpande":190903,"sandeep sharma":153909,"kwena maphaka":846111,
  "nandre burger":616020,"ravindra jadeja":616520,"sam curran":848530,
  "donovan ferreira":597841,"ravi bishnoi":226280,"adam milne":244816,
  "dasun shanaka":849378,"rajat patidar":760758,"virat kohli":616517,
  "tim david":845940,"devdutt padikkal":591960,"philip salt":848522,"phil salt":848522,
  "jitesh sharma":226474,"krunal pandya":171069,"jacob bethell":848524,
  "romario shepherd":845509,"josh hazlewood":845819,"bhuvneshwar kumar":244967,
  "nuwan thushara":226338,"venkatesh iyer":226278,"jacob duffy":845524,
  "jordan cox":593790,"kanishk chouhan":826110,"vihaan malhotra":826112,"vicky ostwal":781081,
  "travis head":845768,"abhishek sharma":846031,"ishan kishan":846036,
  "heinrich klaasen":619866,"nitish kumar reddy":591947,"kamindu mendis":847173,
  "harshal patel":594314,"brydon carse":717796,"pat cummins":352460,
  "jaydev unadkat":332903,"liam livingstone":617405,"shivam mavi":155147,
  "david payne":157435,
};

// ── Cricbuzz image cache — fetch once per session, store as data-URL ──
const _cbzImgCache = {};
async function cbzGetImg(imgId){
  if(!imgId || imgId===174146) return null;
  const key='cbzimg_'+imgId;
  if(_cbzImgCache[key]) return _cbzImgCache[key];
  try{
    const cached=sessionStorage.getItem(key);
    if(cached){ _cbzImgCache[key]=cached; return cached; }
  }catch{}
  try{
    const res=await fetch(CBZ_BASE+'/img/v1/i1/c'+imgId+'/i.jpg',{
      headers:{'x-rapidapi-host':CBZ_HOST,'x-rapidapi-key':CBZ_KEY}
    });
    if(!res.ok) return null;
    const blob=await res.blob();
    return new Promise(resolve=>{
      const reader=new FileReader();
      reader.onloadend=()=>{
        _cbzImgCache[key]=reader.result;
        try{ sessionStorage.setItem(key,reader.result); }catch{}
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }catch{ return null; }
}

// ── Player name → imgId lookup ──
function cbzPlayerImgId(rawName){
  const norm=(rawName||'').replace(/\*\s*\([^)]+\)/g,'').trim().toLowerCase();
  return CBZ_PLAYER_IMG[norm]||174146;
}

// ── Render avatar chip — renders placeholder, lazy-loads photo ──
function cbzAvatar(rawName, size=28, extraStyle=''){
  const imgId=cbzPlayerImgId(rawName);
  const uid='cbzav_'+Math.random().toString(36).slice(2,9);
  const initials=(rawName||'?').replace(/\*\s*\([^)]+\)/g,'').trim()
    .split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  if(imgId && imgId!==174146){
    // Lazy load after render
    setTimeout(async()=>{
      const el=document.getElementById(uid);
      if(!el) return;
      const url=await cbzGetImg(imgId);
      if(url) el.innerHTML=`<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    },0);
  }
  return `<span class="cbz-avatar" id="${uid}" style="width:${size}px;height:${size}px;${extraStyle}">${imgId===174146?initials:''}</span>`;
}

// ── Team logo chip ──
function cbzTeamLogo(teamShort, size=32){
  const meta=IPL_TEAM_META[teamShort];
  if(!meta) return `<span class="cbz-avatar" style="width:${size}px;height:${size}px;background:var(--surface2);">${teamShort}</span>`;
  const uid='cbzlogo_'+Math.random().toString(36).slice(2,9);
  setTimeout(async()=>{
    const el=document.getElementById(uid);
    if(!el) return;
    const url=await cbzGetImg(meta.logoImgId);
    if(url) el.innerHTML=`<img src="${url}" alt="${teamShort}" style="width:100%;height:100%;object-fit:contain;border-radius:4px;">`;
  },0);
  return `<span class="cbz-avatar cbz-logo" id="${uid}" style="width:${size}px;height:${size}px;background:${meta.color}20;border-color:${meta.color}40;">${teamShort}</span>`;
}

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
        <div class="match-pill-meta text-truncate" title="${m.series}">${m.series.substring(0,22)}${m.series.length>22?'...':''}</div>`;
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
        const _addF=(f,type)=>{f=f.replace(/^[†\s]+/,'').trim();if(!f)return;if(!fielding[f])fielding[f]={name:f,catches:0,stumpings:0,runouts:0};fielding[f][type]++;};
        // Caught & bowled: "c & b Bowler" or "c and b Bowler" — fielder IS the bowler
        const cnbM   = outdec.match(/^c\s*(?:&|and)\s*b\s+(.+)/i);
        // Regular catch: "c [†]Fielder b Bowler" — dagger optional, must NOT match c&b
        const catchM = !cnbM && outdec.match(/^c\s+\u2020?([^b][^]*?)\s+b\s+\S/i);
        // Stumping: "st [†]Fielder b Bowler" — dagger optional
        const stumpM = outdec.match(/^st\s+\u2020?([^b][^]*?)\s+b\s+\S/i);
        // Run-out: credit all fielders (slash = multiple fielders involved)
        const runoutM= outdec.match(/run out[^(]*\(([^)]+)\)/i);
        if(cnbM)   _addF(cnbM[1].trim(),   'catches');
        if(catchM) _addF(catchM[1].trim(),  'catches');
        if(stumpM) _addF(stumpM[1].trim(),  'stumpings');
        if(runoutM)runoutM[1].split('/').forEach(f=>_addF(f.trim(),'runouts'));
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
      btn.className='btn btn-sm '+(i===0?'btn-cta':'btn-outline');
      btn.style.width='auto';
      btn.textContent=inn.inningsLabel;
      btn.onclick=()=>{
        cbzActiveInningsIdx=i;
        btnContainer.querySelectorAll('button').forEach((b,bi)=>{
          b.className='btn btn-sm '+(bi===i?'btn-cta':'btn-outline');
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
    ${inn.batting.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.sr||'--'}</td><td class="text-dim text-xs">${b.dismissal}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="cbz-inn-header" class="mt-12">Bowling</div>
  <p class="text-warn text-xs mb-6">\u26a0 Dot balls not available from Cricbuzz summary API -- enter manually in the Scorecards form after importing.</p>
  <table class="cbz-preview-table">
    <thead><tr><th>Bowler</th><th>Ov</th><th>R</th><th>W</th><th>Eco</th><th>0s</th><th>Mdns</th></tr></thead>
    <tbody>
    ${inn.bowling.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.overs}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${b.economy}</td><td class="text-warn">--</td><td>${b.maidens}</td></tr>`).join('')}
    </tbody>
  </table>`;
  if(inn.fielding.length){
    html+=`<div class="cbz-inn-header" class="mt-12">Fielding (auto-extracted)</div>
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

  // Scroll to scorecards section (scroll layout — no tab switching)
  const _scEl=document.getElementById('tab-scorecards');
  if(_scEl) _scEl.scrollIntoView({behavior:'smooth',block:'start'});

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
    html+=`<div class="cbz-inn-header ${i>0?'mt-16 section-divider':''}">${inn.inningsLabel} -- Batting</div>
    <table class="cbz-preview-table">
      <thead><tr><th>Player</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th>Dismissal</th></tr></thead>
      <tbody>${inn.batting.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.sr||'--'}</td><td class="text-dim text-xs">${b.dismissal}</td></tr>`).join('')}</tbody>
    </table>
    <div class="cbz-inn-header" class="mt-10">${inn.inningsLabel} -- Bowling</div>
    <p class="text-warn text-xs mb-6">\u26a0 Dot balls not available from API -- enter manually.</p>
    <table class="cbz-preview-table">
      <thead><tr><th>Bowler</th><th>Ov</th><th>R</th><th>W</th><th>Eco</th><th>Mdns</th></tr></thead>
      <tbody>${inn.bowling.map(b=>`<tr><td><strong>${b.name}</strong></td><td>${b.overs}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${b.economy}</td><td>${b.maidens}</td></tr>`).join('')}</tbody>
    </table>`;
    if(inn.fielding.length){
      html+=`<div class="cbz-inn-header" class="mt-10">${inn.inningsLabel} -- Fielding</div>
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
      el.innerHTML = '<div class="mt-empty"><div class="mt-empty-icon">&#x1F44B;</div><strong class="mt-empty-title">Register first</strong><br>Go to the Setup tab to get started.</div>';
    } else {
      el.innerHTML = '<div class="mt-empty"><div class="mt-empty-icon">&#x1F3CF;</div><strong class="mt-empty-title">No players yet</strong><br>Your roster will appear here once players join <strong class="mt-empty-accent">' + tn + '</strong>.</div>';
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
  var tHtml = '<div class="mt-tracker-grid">';
  checks.forEach(function(c){
    var cellCls=c.ok?'mt-tracker-cell-ok':'mt-tracker-cell-err';
    var lblCls=c.ok?'mt-tracker-label-ok':'mt-tracker-label-err';
    var valCls=c.ok?'mt-tracker-val-ok':'mt-tracker-val-err';
    tHtml += '<div class="mt-tracker-cell '+cellCls+'">'
      + '<div class="mt-tracker-label '+lblCls+'">'+(c.ok?'&#10003;':'&#10007;')+' '+c.label+'</div>'
      + '<div class="mt-tracker-val '+valCls+'">'+c.val+'</div></div>';
  });
  tHtml += '</div>';

  var _isLocked=!!(roomState.squadLocked); var _isAdminUser=!!isAdmin;
  var statusHtml = allValid
    ? '<div class="mt-status-valid">&#10003; Squad valid &mdash; all criteria met</div>'
    : '<div class="mt-status-invalid">&#10007; Squad not valid &mdash; fix red criteria above. Team is DISQUALIFIED from scoring until valid.</div>';

  // IPL team jersey colors
  var JERSEY={CSK:'#F9CD05',MI:'#004BA0',RCB:'#EC1C24',KKR:'#3A225D',DC:'#004C93',PBKS:'#ED1B24',RR:'#EA1A85',SRH:'#FF822A',GT:'#1C1C2B',LSG:'#A72056'};
  var JERSEY_TXT={CSK:'#000',MI:'#fff',RCB:'#fff',KKR:'#fff',DC:'#fff',PBKS:'#fff',RR:'#fff',SRH:'#fff',GT:'#fff',LSG:'#fff'};

  // Build a player card (jersey style) — uses data attributes to avoid quote escaping issues
  function playerCard(name, sec, compact){
    var p=pData(name), role=p.role||p.r||'', ipl=(p.iplTeam||p.t||'').toUpperCase(), os=!!(p.isOverseas||p.o||name.indexOf('*')>=0);
    var pts=ptsMap[name.toLowerCase()]||0;
    var shortName=name.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    if(shortName.length>14){var parts=shortName.split(' ');shortName=parts.length>1?parts[0][0]+'. '+parts.slice(1).join(' '):shortName.substring(0,12)+'...';}
    var safeName=encodeURIComponent(name);
    var targets=sec==='xi'?[['bench','Bench'],['reserves','Res']]:sec==='bench'?[['xi','XI'],['reserves','Res']]:[['xi','XI'],['bench','Bench']];
    var moveHtml=targets.map(function(tb){
      return '<button data-n="'+safeName+'" data-f="'+sec+'" data-t="'+tb[0]+'" onclick="event.stopPropagation();window.mt_move_A(decodeURIComponent(this.dataset.n),this.dataset.f,this.dataset.t)" class="mt-move-btn">'+tb[1]+'</button>';
    }).join('');
    var ptsCls=pts>0?'mt-player-pts-pos':pts<0?'mt-player-pts-neg':'mt-player-pts-zero';

    var _jclr2=JERSEY[ipl]||'rgba(255,255,255,.25)';
    var _cardPhoto=cbzAvatar(name,38,'border-radius:8px !important;border:2px solid '+_jclr2+';');
    return '<div class="mt-player-card" onclick="window.showPlayerModal(\''+name.replace(/'/g,"\\'")+'\')">'
      + '<div style="position:relative;flex-shrink:0;display:inline-flex;">'+_cardPhoto+(os?'<div class="mt-os-dot"></div>':'')+'</div>'
      + '<div class="mt-player-info">'
      + '<div class="mt-player-name">'+shortName+'</div>'
      + '<div class="mt-player-role">'+roleIcon(role,14)+' '+role+'</div>'
      + '</div>'
      + '<div class="mt-player-pts '+ptsCls+'">'+(pts>0?'+':'')+pts+'</div>'
      + '<div class="mt-move-btns" onclick="event.stopPropagation()">'+moveHtml+'</div>'
      + '</div>';
  }

  // Group XI by role for pitch layout
  var xiWks=[],xiBats=[],xiArs=[],xiBowls=[];
  sq.xi.forEach(function(n){
    var r=pRole(n);
    if(r.indexOf('wicketkeeper')>=0||r.indexOf('keeper')>=0) xiWks.push(n);
    else if(r.indexOf('all-rounder')>=0||r.indexOf('all rounder')>=0) xiArs.push(n);
    else if(r.indexOf('bowler')>=0) xiBowls.push(n);
    else xiBats.push(n);
  });

  function roleSection(label,emoji,players,key,gradientCls){
    if(!players.length) return '';
    return '<div class="mt-section-mb">'
      + '<div class="mt-role-hdr '+gradientCls+'">'
      + '<span class="mt-role-label">'+emoji+' '+label+'</span>'
      + '<span class="mt-role-count">'+players.length+'</span></div>'
      + '<div class="mt-role-body">'
      + players.map(function(n){return playerCard(n,key,false);}).join('')
      + '</div></div>';
  }

  // Dream11-style player chip on the pitch
  function pitchChip(name){
    var p=pData(name), ipl=(p.iplTeam||p.t||'').toUpperCase(), os=!!(p.isOverseas||p.o||name.indexOf('*')>=0);
    var pts=ptsMap[name.toLowerCase()]||0;
    var shortName=name.replace(/\*?\s*\([^)]*\)\s*$/,'').trim();
    if(shortName.length>12){var parts=shortName.split(' ');shortName=parts.length>1?parts[0][0]+'. '+parts.slice(1).join(' ').substring(0,10):shortName.substring(0,10)+'…';}
    var safeName=encodeURIComponent(name);
    var ptsCls=pts>0?'pitch-pts-pos':pts<0?'pitch-pts-neg':'pitch-pts-zero';
    var targets=[['bench','B'],['reserves','R']];
    var btns=targets.map(function(tb){
      return '<button data-n="'+safeName+'" data-f="xi" data-t="'+tb[0]+'" onclick="event.stopPropagation();window.mt_move_A(decodeURIComponent(this.dataset.n),this.dataset.f,this.dataset.t)" class="pitch-move-btn">→'+tb[1]+'</button>';
    }).join('');
    var _jclr=JERSEY[ipl]||'rgba(255,255,255,.3)';
    var _photoEl=cbzAvatar(name,44,'box-shadow:0 4px 16px rgba(0,0,0,.4),0 0 0 2.5px '+_jclr+';transition:box-shadow .2s;');
    return '<div class="pitch-player" onclick="window.showPlayerModal(\''+name.replace(/'/g,"\\'")+'\')">'
      + '<div style="position:relative;display:inline-flex;">'
      +   _photoEl
      +   (os?'<div class="pitch-os-ring"></div>':'')
      + '</div>'
      + '<div class="pitch-name">'+shortName+'</div>'
      + '<div class="pitch-pts '+ptsCls+'">'+(pts!==0?((pts>0?'+':'')+pts):'—')+'</div>'
      + '<div class="pitch-actions" onclick="event.stopPropagation()">'+btns+'</div>'
      + '</div>';
  }

  function pitchRow(label, players){
    if(!players.length) return '';
    return '<div class="pitch-row">'
      + '<div class="pitch-row-label">'+label+'</div>'
      + '<div class="pitch-row-players">'+players.map(pitchChip).join('')+'</div>'
      + '</div>';
  }

  // Playing XI — cricket ground layout
  var pitchHtml='<div class="pitch-ground">'
    + '<div class="pitch-overlay"></div>'
    + '<div class="pitch-strip"></div>'
    + '<div class="pitch-crease pitch-crease-top"></div>'
    + '<div class="pitch-crease pitch-crease-bot"></div>'
    + '<div class="pitch-circle"></div>'
    + '<div class="pitch-content">'
    + pitchRow(roleIcon('Wicketkeeper',18)+' WK', xiWks)
    + pitchRow(roleIcon('Batter',18)+' BAT', xiBats)
    + pitchRow(roleIcon('All-Rounder',18)+' AR', xiArs)
    + pitchRow(roleIcon('Bowler',18)+' BOWL', xiBowls)
    + '</div>'
    + '<div class="pitch-xi-badge">'+xiCount+'/11</div>'
    + '</div>';

  // Bench section (below pitch)
  function offPitchSection(title,players,key,hdrCls,icon){
    if(!players.length&&key!=='bench') return '';
    return '<div class="mt-section-mt">'
      + '<div class="mt-offpitch-hdr '+hdrCls+'"><span class="mt-offpitch-label">'+icon+' '+title+'</span><span class="mt-offpitch-count">'+players.length+' players</span></div>'
      + '<div class="mt-offpitch-body">'
      + (players.length?'<div class="mt-offpitch-grid">'+players.map(function(n){return playerCard(n,key,true);}).join('')+'</div>':'<div class="mt-offpitch-empty">No players</div>')
      + '</div></div>';
  }

  var pxi=document.getElementById('mt_xi_A'); if(pxi) pxi.textContent='XI: '+xiCount+'/11';
  var pbn=document.getElementById('mt_bench_A'); if(pbn) pbn.textContent='Bench: '+benchCount+'/5';
  var prs=document.getElementById('mt_res_A'); if(prs) prs.textContent='Reserves: '+resCount;
  var vl=document.getElementById('mt_val_A'); if(vl) vl.style.display='none';

  var _isLocked=!!(roomState.squadLocked);
  var lockBanner=_isLocked?'<div class="mt-lock-banner">Squad changes are LOCKED by admin</div>':'';

  el.innerHTML = lockBanner + statusHtml + tHtml
    + '<div class="mt-pad">'
    + pitchHtml
    + offPitchSection('BENCH',sq.bench,'bench','mt-bench-hdr','&#129681;')
    + offPitchSection('RESERVES',sq.reserves,'reserves','mt-reserves-hdr','&#128230;')
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
  if(msgs.length){if(myTeamName)update(ref(db,'auctions/'+roomId+'/teams/'+myTeamName),{squadValid:false,activeSquad:null}).catch(function(){});window.showAlert(msgs.join(' \u00b7 '));return;}
  try{
    await set(ref(db,'users/'+user.uid+'/squads/auctions/'+roomId),{xi:sq.xi,bench:sq.bench,savedAt:Date.now()});
    window.showAlert('Squad saved!','ok');
    if(myTeamName)update(ref(db,'auctions/'+roomId+'/teams/'+myTeamName),{squadValid:true,activeSquad:sq.xi.concat(sq.bench)}).catch(function(){});
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
{sr:20,date:"12 Apr",t1:"MI",t2:"RCB",city:"Mumbai",time:"19:30"},
{sr:21,date:"13 Apr",t1:"SRH",t2:"RR",city:"Hyderabad",time:"19:30"},
{sr:22,date:"14 Apr",t1:"CSK",t2:"KKR",city:"Chennai",time:"19:30"},
{sr:23,date:"15 Apr",t1:"RCB",t2:"LSG",city:"Bengaluru",time:"19:30"},
{sr:24,date:"16 Apr",t1:"MI",t2:"PBKS",city:"Mumbai",time:"19:30"},
{sr:25,date:"17 Apr",t1:"GT",t2:"KKR",city:"Ahmedabad",time:"19:30"},
{sr:26,date:"18 Apr",t1:"RCB",t2:"DC",city:"Bengaluru",time:"15:30"},
{sr:27,date:"18 Apr",t1:"SRH",t2:"CSK",city:"Hyderabad",time:"19:30"},
{sr:28,date:"19 Apr",t1:"KKR",t2:"RR",city:"Kolkata",time:"15:30"},
{sr:29,date:"19 Apr",t1:"PBKS",t2:"LSG",city:"New Chandigarh",time:"19:30"},
{sr:30,date:"20 Apr",t1:"GT",t2:"MI",city:"Ahmedabad",time:"19:30"},
{sr:31,date:"21 Apr",t1:"SRH",t2:"DC",city:"Hyderabad",time:"19:30"},
{sr:32,date:"22 Apr",t1:"LSG",t2:"RR",city:"Lucknow",time:"19:30"},
{sr:33,date:"23 Apr",t1:"MI",t2:"CSK",city:"Mumbai",time:"19:30"},
{sr:34,date:"24 Apr",t1:"RCB",t2:"GT",city:"Bengaluru",time:"19:30"},
{sr:35,date:"25 Apr",t1:"DC",t2:"PBKS",city:"Delhi",time:"15:30"},
{sr:36,date:"25 Apr",t1:"RR",t2:"SRH",city:"Jaipur",time:"19:30"},
{sr:37,date:"26 Apr",t1:"GT",t2:"CSK",city:"Ahmedabad",time:"15:30"},
{sr:38,date:"26 Apr",t1:"LSG",t2:"KKR",city:"Lucknow",time:"19:30"},
{sr:39,date:"27 Apr",t1:"DC",t2:"RCB",city:"Delhi",time:"19:30"},
{sr:40,date:"28 Apr",t1:"PBKS",t2:"RR",city:"New Chandigarh",time:"19:30"},
{sr:41,date:"29 Apr",t1:"MI",t2:"SRH",city:"Mumbai",time:"19:30"},
{sr:42,date:"30 Apr",t1:"GT",t2:"RCB",city:"Ahmedabad",time:"19:30"},
{sr:43,date:"01 May",t1:"RR",t2:"DC",city:"Jaipur",time:"19:30"},
{sr:44,date:"02 May",t1:"CSK",t2:"MI",city:"Chennai",time:"15:30"},
{sr:45,date:"03 May",t1:"SRH",t2:"KKR",city:"Hyderabad",time:"15:30"},
{sr:46,date:"03 May",t1:"GT",t2:"PBKS",city:"Ahmedabad",time:"19:30"},
{sr:47,date:"04 May",t1:"MI",t2:"LSG",city:"Mumbai",time:"19:30"},
{sr:48,date:"05 May",t1:"DC",t2:"CSK",city:"Delhi",time:"19:30"},
{sr:49,date:"06 May",t1:"SRH",t2:"PBKS",city:"Hyderabad",time:"19:30"},
{sr:50,date:"07 May",t1:"LSG",t2:"RCB",city:"Lucknow",time:"19:30"},
{sr:51,date:"08 May",t1:"DC",t2:"KKR",city:"Delhi",time:"19:30"},
{sr:52,date:"09 May",t1:"RR",t2:"GT",city:"Jaipur",time:"19:30"},
{sr:53,date:"10 May",t1:"CSK",t2:"LSG",city:"Chennai",time:"15:30"},
{sr:54,date:"10 May",t1:"RCB",t2:"MI",city:"Raipur",time:"19:30"},
{sr:55,date:"11 May",t1:"PBKS",t2:"DC",city:"Dharamshala",time:"19:30"},
{sr:56,date:"12 May",t1:"GT",t2:"SRH",city:"Ahmedabad",time:"19:30"},
{sr:57,date:"13 May",t1:"RCB",t2:"KKR",city:"Raipur",time:"19:30"},
{sr:58,date:"14 May",t1:"PBKS",t2:"MI",city:"Dharamshala",time:"19:30"},
{sr:59,date:"15 May",t1:"LSG",t2:"CSK",city:"Lucknow",time:"19:30"},
{sr:60,date:"16 May",t1:"KKR",t2:"GT",city:"Kolkata",time:"19:30"},
{sr:61,date:"17 May",t1:"PBKS",t2:"RCB",city:"Dharamshala",time:"15:30"},
{sr:62,date:"17 May",t1:"DC",t2:"RR",city:"Delhi",time:"19:30"},
{sr:63,date:"18 May",t1:"CSK",t2:"SRH",city:"Chennai",time:"19:30"},
{sr:64,date:"19 May",t1:"RR",t2:"LSG",city:"Jaipur",time:"19:30"},
{sr:65,date:"20 May",t1:"KKR",t2:"MI",city:"Kolkata",time:"19:30"},
{sr:66,date:"21 May",t1:"CSK",t2:"GT",city:"Chennai",time:"19:30"},
{sr:67,date:"22 May",t1:"SRH",t2:"RCB",city:"Hyderabad",time:"19:30"},
{sr:68,date:"23 May",t1:"LSG",t2:"PBKS",city:"Lucknow",time:"19:30"},
{sr:69,date:"24 May",t1:"MI",t2:"RR",city:"Mumbai",time:"15:30"},
{sr:70,date:"24 May",t1:"KKR",t2:"DC",city:"Kolkata",time:"19:30"}
];
var TRADE_WINDOWS=[10, 20, 30, 40, 50, 60];
var TEAM_CLR={CSK:'#F9CD05',MI:'#004BA0',RCB:'#EC1C24',KKR:'#3A225D',DC:'#004C93',PBKS:'#ED1B24',RR:'#EA1A85',SRH:'#FF822A',GT:'#1C1C2B',LSG:'#A72056'};
var TEAM_TXT={CSK:'#000',MI:'#fff',RCB:'#fff',KKR:'#fff',DC:'#fff',PBKS:'#fff',RR:'#fff',SRH:'#fff',GT:'#fff',LSG:'#fff'};

window.renderSchedule=function(){
 var el=document.getElementById('scheduleBody'); if(!el) return;
 var html=''; var prevDate=''; var tradeWindowSet=new Set(TRADE_WINDOWS);
 // Today's date as "Mon D" format matching schedule strings like "Mar 22"
 var now=new Date(); var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 var todayStr=months[now.getMonth()]+' '+now.getDate();
 IPL_SCHEDULE.forEach(function(m,i){
  if(tradeWindowSet.has(i)){
   var _wIdx=TRADE_WINDOWS.indexOf(i)+1;
   var _prevMatch=IPL_SCHEDULE[i-1]; var _nextMatch=IPL_SCHEDULE[i];
   html+='<div class="sch-trade-window">'
    +'<div class="sch-trade-title">CHANGE &amp; TRADE WINDOW '+_wIdx+'</div>'
    +'<div class="sch-trade-sub">Between Match #'+(_prevMatch?_prevMatch.sr:'')+' ('+(_prevMatch?_prevMatch.date:'')+') and Match #'+(_nextMatch?_nextMatch.sr:'')+' ('+(_nextMatch?_nextMatch.date:'')+')</div>'
    +'<div class="sch-trade-note">Teams may trade players and adjust squads during this window</div></div>';
  }
  if(m.date!==prevDate){ html+='<div class="sch-date-hdr">'+m.date+' 2026</div>'; prevDate=m.date; }
  var isToday=m.date===todayStr;
  // Determine if past (compare month+day numerically via Date parsing)
  var mDate=new Date('2026 '+m.date); var isPast=mDate<now&&!isToday;
  var matchCls='sch-match'+(isToday?' sch-match--today':isPast?' sch-match--past':'');
  html+='<div class="'+matchCls+'">'
   +'<span class="sch-sr">#'+m.sr+'</span>'
   +(isToday?'<span class="sch-today-badge">TODAY</span>':'')
   +'<span class="sch-team-badge team-bg-'+m.t1+'">'+m.t1+'</span>'
   +'<span class="sch-vs">vs</span>'
   +'<span class="sch-team-badge team-bg-'+m.t2+'">'+m.t2+'</span>'
   +'<span class="sch-city">'+m.city+'</span>'
   +'<span class="sch-time">'+m.time+' IST</span></div>';
 }); el.innerHTML=html;
 // Scroll today into view
 var todayEl=el.querySelector('.sch-match--today');
 if(todayEl) setTimeout(function(){todayEl.scrollIntoView({behavior:'smooth',block:'center'});},200);
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
 if(!arr.length){ el.innerHTML='<div class="trade-list-empty">No players selected</div>'; return; }
 el.innerHTML=arr.map(function(p,i){
  return '<div class="trade-list-item">'
   +'<span class="trade-list-name">'+p.name+'</span>'
   +'<button onclick="window._removeTradePlayer(\''+side+'\','+i+')" class="trade-list-remove">x</button>'
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
  // Force re-read and re-render trades
  get(ref(db,'auctions/'+roomId)).then(function(snap){
   var d=snap.val(); if(d) window.renderTrades(d);
  });
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
  get(ref(db,'auctions/'+roomId)).then(function(s){if(s.val())window.renderTrades(s.val());});
 });
};

window.cancelTrade=function(tradeId){
 if(!roomId) return;
 var upd={};
 upd['auctions/'+roomId+'/trades/'+tradeId+'/status']='cancelled';
 update(ref(db),upd).then(function(){
  window.showAlert('Trade cancelled.','ok');
  get(ref(db,'auctions/'+roomId)).then(function(s){if(s.val())window.renderTrades(s.val());});
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
   if(isForMe) actions='<button class="btn btn-sm trade-accept-btn" onclick="window.acceptTrade(\''+tid+'\')">Accept</button><button class="btn btn-ghost btn-sm" onclick="window.rejectTrade(\''+tid+'\')">Reject</button>';
   else if(isMine) actions='<button class="btn btn-ghost btn-sm" onclick="window.cancelTrade(\''+tid+'\')">Cancel</button>';
   else actions='<span class="trade-other-label">Between other teams</span>';

   return '<div class="trade-card">'
    +'<div class="trade-card-hdr">'
    +'<span class="trade-card-teams">'+t.from+' &#8596; '+t.to+'</span>'
    +'<span class="trade-card-date">'+new Date(t.proposedAt).toLocaleDateString()+'</span></div>'
    +'<div class="trade-card-grid">'
    +'<div><div class="trade-card-section-label">'+t.from+' sends:</div>'
    +t.sending.map(function(n){return '<div class="trade-card-player-send">- '+n+'</div>';}).join('')+'</div>'
    +'<div><div class="trade-card-section-label">'+t.to+' sends:</div>'
    +t.receiving.map(function(n){return '<div class="trade-card-player-recv">- '+n+'</div>';}).join('')+'</div></div>'
    +'<div class="trade-card-actions">'+actions+'</div></div>';
  }).join('');
 }

 if(!history.length){ historyEl.innerHTML='<div class="empty">No completed trades yet.</div>'; }
 else {
  historyEl.innerHTML=history.slice(0,20).map(function(e){
   var t=e[1];
   var statusLabel = t.status==='accepted'?'Completed':t.status==='rejected'?'Rejected':'Cancelled';
   var cardCls = t.status==='accepted'?'trade-history-card':'trade-history-card trade-history-card-inactive';
   var statusCls = 'trade-history-status trade-history-status-'+t.status;
   return '<div class="'+cardCls+'">'
    +'<div class="trade-history-hdr">'
    +'<span class="trade-history-teams">'+t.from+' &#8596; '+t.to+'</span>'
    +'<span class="'+statusCls+'">'+statusLabel+'</span></div>'
    +'<div class="trade-history-detail">Sent: '+t.sending.join(', ')+' | Received: '+t.receiving.join(', ')+'</div></div>';
  }).join('');
 }
};

window.toggleSquadLock_A=function(){
 if(!isAdmin||!roomId) return;
 var currentLock=roomState&&roomState.squadLocked;
 var upd={}; upd['auctions/'+roomId+'/squadLocked']=!currentLock;
 update(ref(db),upd).then(function(){ window.showAlert(!currentLock?'My Team changes LOCKED.':'My Team changes UNLOCKED.','ok'); }).catch(function(e){ window.showAlert('Failed: '+e.message); });
};

// Super Admin: Toggle release/replace lock
window.toggleReleaseLock_A=function(){
 if(!isSuperAdminEmail(user?.email)||!roomId) return window.showAlert('Only the super admin can toggle the release lock.','error');
 var currentLock=roomState&&roomState.releaseLocked;
 var upd={}; upd['auctions/'+roomId+'/releaseLocked']=!currentLock;
 update(ref(db),upd).then(function(){ window.showAlert(!currentLock?'Player releases LOCKED. No one can release players.':'Player releases UNLOCKED.','ok'); }).catch(function(e){ window.showAlert('Failed: '+e.message); });
};

// ═══════════════════════════════════════════════════════════════
// COUNTER-UP ANIMATION
// ═══════════════════════════════════════════════════════════════
function counterUp(el, target, duration=700){
  if(!el) return;
  const from=parseFloat(el.textContent)||0;
  const start=performance.now();
  function tick(now){
    const p=Math.min((now-start)/duration,1);
    const ease=1-Math.pow(1-p,3);
    el.textContent=Math.round(from+(target-from)*ease);
    if(p<1) requestAnimationFrame(tick);
    else el.textContent=target;
  }
  requestAnimationFrame(tick);
  el.classList.remove('count-flash');
  void el.offsetWidth;
  el.classList.add('count-flash');
  setTimeout(()=>el.classList.remove('count-flash'),500);
}

// ═══════════════════════════════════════════════════════════════
// LIVE SCORE TICKER
// ═══════════════════════════════════════════════════════════════
let _liveCache=null, _liveTTL=0, _liveTimer=null;

async function fetchLiveScores(){
  const now=Date.now();
  if(_liveCache&&now<_liveTTL) return _liveCache;
  try{
    const sk='cbz_live_ts', sd='cbz_live_data';
    const ts=parseInt(sessionStorage.getItem(sk)||'0');
    if(ts>now){ _liveCache=JSON.parse(sessionStorage.getItem(sd)||'[]'); _liveTTL=ts; return _liveCache; }
    const res=await fetch('https://cricbuzz-cricket.p.rapidapi.com/matches/v1/live',{
      headers:{'x-rapidapi-host':'cricbuzz-cricket.p.rapidapi.com','x-rapidapi-key':'6d53928bfdmsh545332aded830a3p11bdaajsncf079fc57095'}
    });
    if(!res.ok) return [];
    const data=await res.json();
    const iplMatches=[];
    (data.typeMatches||[]).forEach(tm=>{
      (tm.seriesMatches||[]).forEach(sm=>{
        const s=sm.seriesAdWrapper||sm;
        if(s.seriesId==9241||(s.seriesName||'').toLowerCase().includes('premier league')){
          (s.matches||[]).forEach(m=>iplMatches.push(m));
        }
      });
    });
    _liveCache=iplMatches; _liveTTL=now+60000;
    try{ sessionStorage.setItem(sk,String(_liveTTL)); sessionStorage.setItem(sd,JSON.stringify(iplMatches)); }catch{}
    return iplMatches;
  }catch{ return []; }
}

function renderLiveTicker(matches){
  const bar=document.getElementById('liveTickerBar');
  if(!bar) return;
  const dot=document.getElementById('navLiveDot');
  if(!matches||!matches.length){
    bar.innerHTML='<span class="ticker-no-live">No IPL matches live right now</span>';
    if(dot) dot.style.display='none';
    return;
  }
  if(dot) dot.style.display='inline-block';
  function fmtI(inn){ if(!inn) return ''; return `${inn.runs??'—'}/${inn.wickets??'—'} (${inn.overs??'—'})`; }
  const items=matches.map(m=>{
    const mi=m.matchInfo||{};
    const ms=m.matchScore||{};
    const t1=mi.team1?.teamSName||mi.team1?.teamName||'';
    const t2=mi.team2?.teamSName||mi.team2?.teamName||'';
    const t1s=fmtI(ms.team1Score?.inngs1)||fmtI(ms.team1Score?.inngs2)||'';
    const t2s=fmtI(ms.team2Score?.inngs1)||fmtI(ms.team2Score?.inngs2)||'';
    const state=mi.state||'';
    return `<span class="ticker-match"><span class="ticker-live-dot"></span><span class="ticker-team">${t1}</span> <span class="ticker-score">${t1s}</span> <span class="ticker-sep">vs</span> <span class="ticker-team">${t2}</span> <span class="ticker-score">${t2s}</span><span class="ticker-state"> ${state}</span></span>`;
  }).join('<span class="ticker-sep" style="padding:0 16px;opacity:.3;">|</span>');
  // Double the content for seamless loop
  bar.innerHTML=`<div class="live-ticker-inner">${items}<span style="padding:0 32px;opacity:.3;">•</span>${items}</div>`;
}

async function startLiveTicker(){
  // Fetch once per app session — no auto-refresh to conserve API quota
  const matches=await fetchLiveScores();
  renderLiveTicker(matches);
}

// ═══════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════
window.openSidebar=function(){
  const overlay=document.getElementById('sidebarOverlay');
  const sidebar=document.getElementById('sidebar');
  if(overlay) overlay.classList.add('open');
  if(sidebar) sidebar.classList.add('open');
  document.body.style.overflow='hidden';
  // Update sidebar stats
  window.updateSidebarStats();
};
window.closeSidebar=function(){
  const overlay=document.getElementById('sidebarOverlay');
  const sidebar=document.getElementById('sidebar');
  if(overlay) overlay.classList.remove('open');
  if(sidebar) sidebar.classList.remove('open');
  document.body.style.overflow='';
};
// Show/hide dashboard vs room sidebar sections
window.setSidebarMode=function(mode){
  const dash=document.getElementById('sidebarDash');
  const room=document.getElementById('sidebarRoom');
  if(dash) dash.style.display=mode==='room'?'none':'block';
  if(room) room.style.display=mode==='room'?'block':'none';
};
// Update sidebar footer stats (purse remaining, players available)
window.updateSidebarStats=function(){
  const statsEl=document.getElementById('sidebarStats');
  const liveEl=document.getElementById('sidebarLivePill');
  const liveCount=document.getElementById('sidebarLiveCount');
  const roomLabel=document.getElementById('sidebarRoomLabel');
  if(!statsEl) return;
  if(roomState&&roomId){
    const myTeam=roomState.teams&&myTeamName?roomState.teams[myTeamName]:null;
    const avail=roomState.players?Object.values(roomState.players).filter(p=>p.status==='available').length:0;
    const purse=myTeam?myTeam.budget:null;
    statsEl.innerHTML=(purse!=null?`<div><strong>${purse.toFixed(1)} Cr</strong> remaining</div>`:'')
      +(avail?`<div>${avail} players available</div>`:'');
    if(roomLabel) roomLabel.textContent=document.getElementById('roomTitleDisplay')?.textContent||'Room';
  } else {
    statsEl.innerHTML='';
  }
  // Live members count
  if(liveEl&&liveCount&&roomState){
    const memberCount=roomState.members?Object.keys(roomState.members).length:0;
    if(memberCount>0){
      liveEl.style.display='inline-flex';
      liveCount.textContent=`${memberCount} live`;
    } else { liveEl.style.display='none'; }
  } else if(liveEl){ liveEl.style.display='none'; }
};
// Scroll to dashboard section
window.scrollToDashSection=function(section){
  const el=document.getElementById(`tab-${section}`);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
};
// ESC key closes sidebar
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') window.closeSidebar();
});
// Update sidebar mode when entering/leaving room
const _origEnterRoom=window.enterRoom;
if(_origEnterRoom) window.enterRoom=function(...args){
  const r=_origEnterRoom(...args);
  window.setSidebarMode('room');
  return r;
};
const _origBTD=window.backToDashboard;
if(_origBTD) window.backToDashboard=function(...args){
  window.setSidebarMode('dash');
  return _origBTD(...args);
};

// ═══════════════════════════════════════════════════════
// SOLD FLASH ANIMATION
// ═══════════════════════════════════════════════════════
window.showSoldFlash=function(teamName, bid, playerName){
  const el=document.getElementById('soldFlash');
  const teamEl=document.getElementById('soldFlashTeam');
  const priceEl=document.getElementById('soldFlashPrice');
  if(!el) return;
  // Find team color based on IPL team abbreviation in team name
  let bg='#602F92';
  Object.entries(IPL_TEAM_COLORS).forEach(([k,v])=>{
    if(teamName&&teamName.toUpperCase().includes(k)) bg=v;
  });
  el.style.background=bg;
  if(teamEl) teamEl.textContent=teamName||'';
  if(priceEl) priceEl.textContent=`₹${bid?bid.toFixed(2):'0.00'} Cr`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2600);
};

// ═══════════════════════════════════════════════════════
// SWIPE GESTURE — NOT INTERESTED (mobile)
// ═══════════════════════════════════════════════════════
(function setupSwipeGesture(){
  let touchStartX=0, touchStartY=0;
  document.addEventListener('touchstart',function(e){
    touchStartX=e.touches[0].clientX;
    touchStartY=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    const dx=e.changedTouches[0].clientX-touchStartX;
    const dy=e.changedTouches[0].clientY-touchStartY;
    // Left swipe (dx < -80) with mostly horizontal motion
    if(dx<-80&&Math.abs(dy)<60){
      const niBtn=document.getElementById('niBtn');
      const niControls=document.getElementById('niControls');
      if(niControls&&niControls.style.display!=='none'&&niBtn){
        // Tilt the auction block
        const ablock=document.getElementById('auctionBlockDisplay');
        if(ablock){ ablock.classList.add('not-interested'); setTimeout(()=>ablock.classList.remove('not-interested'),700); }
        window.pressNotInterested();
      }
    }
  },{passive:true});
})();

// ═══════════════════════════════════════════════════════
// THEME TOGGLE UPDATE — sun/moon icon swap
// ═══════════════════════════════════════════════════════
(function patchThemeToggle(){
  const orig=window.toggleDark;
  window.toggleDark=function(){
    orig&&orig();
    const isLight=document.body.classList.contains('light');
    const moon=document.querySelector('.theme-toggle .icon-moon');
    const sun=document.querySelector('.theme-toggle .icon-sun');
    if(moon) moon.style.display=isLight?'none':'block';
    if(sun) sun.style.display=isLight?'block':'none';
  };
  // Set initial icon state
  document.addEventListener('DOMContentLoaded',function(){
    const isLight=document.body.classList.contains('light');
    const moon=document.querySelector('.theme-toggle .icon-moon');
    const sun=document.querySelector('.theme-toggle .icon-sun');
    if(moon) moon.style.display=isLight?'none':'block';
    if(sun) sun.style.display=isLight?'block':'none';
    // Show dashboard sidebar by default
    window.setSidebarMode('dash');
  });
})();

// ─────────────────────────────────────────────────────────
// Expose helpers to window for cd-app.js (new design layer)
// ─────────────────────────────────────────────────────────
window.cbzAvatar = cbzAvatar;
window.cbzGetImg = cbzGetImg;
window.cbzPlayerImgId = cbzPlayerImgId;
window.IPL_TEAM_META = typeof IPL_TEAM_META !== 'undefined' ? IPL_TEAM_META : {};
window.IPL_SCHEDULE = typeof IPL_SCHEDULE !== 'undefined' ? IPL_SCHEDULE : [];
