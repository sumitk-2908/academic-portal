import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileTabs from "@/components/profile/ProfileTabs";

export const metadata = {
  title: "My Profile | Academic Portal",
};

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl w-full">
      <h1 className="mb-6 hidden text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:block">
        Student Profile
      </h1>
      <ProfileHeader />
      <ProfileStats />
      
      {/* Mock Badges Row per mockup */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase text-amber-800 dark:bg-[#412402] dark:text-[#FAC775]">
          ⭐ Pioneer
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase text-blue-800 dark:bg-[#042C53] dark:text-[#85B7EB]">
          ☁️ Contributor
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase text-emerald-800 dark:bg-[#173404] dark:text-[#97C459]">
          🔥 7-day streak
        </span>
      </div>

      <ProfileTabs />
    </div>
  );
}