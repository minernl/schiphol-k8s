/// <reference types="vite/client" />

interface Link {
  name: string;
  href: string;
}

interface Section {
  name: string;
  links: Link[];
}

interface Source {
  name: string;
  sections: Section[];
}
