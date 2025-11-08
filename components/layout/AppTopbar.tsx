import ProfileMenu from "@/components/profile/ProfileMenu";

export default function AppTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 w-full">
      <div className="flex items-center justify-between w-full max-w-[1400px] mx-auto">
        <div className="text-sm font-semibold text-slate-800">Bright Audio Home Base</div>
        <ProfileMenu />
      </div>
    </header>
  );
}
