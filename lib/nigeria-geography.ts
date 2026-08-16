export type NigeriaAdministrativeArea = {
  name: string;
  capital: string;
  zone: "North Central" | "North East" | "North West" | "South East" | "South South" | "South West";
  kind: "state" | "fct";
};

export const NIGERIA_ADMIN_AREAS: NigeriaAdministrativeArea[] = [
  { name: "Abia", capital: "Umuahia", zone: "South East", kind: "state" },
  { name: "Adamawa", capital: "Yola", zone: "North East", kind: "state" },
  { name: "Akwa Ibom", capital: "Uyo", zone: "South South", kind: "state" },
  { name: "Anambra", capital: "Awka", zone: "South East", kind: "state" },
  { name: "Bauchi", capital: "Bauchi", zone: "North East", kind: "state" },
  { name: "Bayelsa", capital: "Yenagoa", zone: "South South", kind: "state" },
  { name: "Benue", capital: "Makurdi", zone: "North Central", kind: "state" },
  { name: "Borno", capital: "Maiduguri", zone: "North East", kind: "state" },
  { name: "Cross River", capital: "Calabar", zone: "South South", kind: "state" },
  { name: "Delta", capital: "Asaba", zone: "South South", kind: "state" },
  { name: "Ebonyi", capital: "Abakaliki", zone: "South East", kind: "state" },
  { name: "Edo", capital: "Benin City", zone: "South South", kind: "state" },
  { name: "Ekiti", capital: "Ado Ekiti", zone: "South West", kind: "state" },
  { name: "Enugu", capital: "Enugu", zone: "South East", kind: "state" },
  { name: "Gombe", capital: "Gombe", zone: "North East", kind: "state" },
  { name: "Imo", capital: "Owerri", zone: "South East", kind: "state" },
  { name: "Jigawa", capital: "Dutse", zone: "North West", kind: "state" },
  { name: "Kaduna", capital: "Kaduna", zone: "North West", kind: "state" },
  { name: "Kano", capital: "Kano", zone: "North West", kind: "state" },
  { name: "Katsina", capital: "Katsina", zone: "North West", kind: "state" },
  { name: "Kebbi", capital: "Birnin Kebbi", zone: "North West", kind: "state" },
  { name: "Kogi", capital: "Lokoja", zone: "North Central", kind: "state" },
  { name: "Kwara", capital: "Ilorin", zone: "North Central", kind: "state" },
  { name: "Lagos", capital: "Ikeja", zone: "South West", kind: "state" },
  { name: "Nasarawa", capital: "Lafia", zone: "North Central", kind: "state" },
  { name: "Niger", capital: "Minna", zone: "North Central", kind: "state" },
  { name: "Ogun", capital: "Abeokuta", zone: "South West", kind: "state" },
  { name: "Ondo", capital: "Akure", zone: "South West", kind: "state" },
  { name: "Osun", capital: "Osogbo", zone: "South West", kind: "state" },
  { name: "Oyo", capital: "Ibadan", zone: "South West", kind: "state" },
  { name: "Plateau", capital: "Jos", zone: "North Central", kind: "state" },
  { name: "Rivers", capital: "Port Harcourt", zone: "South South", kind: "state" },
  { name: "Sokoto", capital: "Sokoto", zone: "North West", kind: "state" },
  { name: "Taraba", capital: "Jalingo", zone: "North East", kind: "state" },
  { name: "Yobe", capital: "Damaturu", zone: "North East", kind: "state" },
  { name: "Zamfara", capital: "Gusau", zone: "North West", kind: "state" },
  { name: "Federal Capital Territory", capital: "Abuja", zone: "North Central", kind: "fct" },
];

export const NIGERIA_STATE_COUNT = 36;
export const NIGERIA_ADMIN_AREA_COUNT = NIGERIA_ADMIN_AREAS.length;

export const RIVERINE_WATCH_V1_PILOT = [
  { state: "Kogi", location: "Lokoja" },
  { state: "Benue", location: "Makurdi" },
] as const;
