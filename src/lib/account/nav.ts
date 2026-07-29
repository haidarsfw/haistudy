/**
 * The six things you can do with your account.
 *
 * One list, shared by the index, the sticky sidebar and every sub-page's own
 * "back" link — so a section can never appear in the menu and not exist, or
 * exist and not be reachable.
 *
 * `/account` stopped being one long scroll. Seven stacked sections meant a
 * phone had to be scrolled past everything to reach anything, and the sticky
 * headings that were meant to help ended up being the only thing on screen.
 * Real routes cost one navigation each and give the browser's own Back button
 * something to do.
 */
export interface AccountNavItem {
  href: string;
  label: string;
  /** One line on the index card. Says what is inside, not what it is called. */
  hint: string;
}

export const ACCOUNT_NAV: readonly AccountNavItem[] = [
  {
    href: "/account/access",
    label: "Akses saya",
    hint: "Periode ujian yang kamu punya, dan tombol masuknya",
  },
  {
    href: "/account/activity",
    label: "Riwayat & referral",
    hint: "Pembelianmu, kode referral, dan siapa yang kamu ajak",
  },
  {
    href: "/account/profile",
    label: "Data diri",
    hint: "Nama, panggilan, WhatsApp, kampus, foto",
  },
  {
    href: "/account/devices",
    label: "Perangkat",
    hint: "Perangkat yang terdaftar, dan cara mengeluarkannya",
  },
  {
    href: "/account/security",
    label: "Keamanan",
    hint: "Password dan cara kamu masuk",
  },
  {
    href: "/account/manage",
    label: "Kelola akun",
    hint: "Unduh data kamu, atau hapus akun",
  },
];
