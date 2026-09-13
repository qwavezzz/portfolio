export interface Project {
  id: string;
  title: string;
  summary: string;
  role: string;
  url: string;
  icon: 'file' | 'browser' | 'folder';
  order: number;
  draft?: boolean;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
}

export interface Contact {
  label: string;
  display: string;
  url: string;
}

// Personal details beyond the name will be supplied later.
export const profile = {
  name: 'qwave',
  specialization: '',
  about: '',
  approach: '',
};

export const projects: Project[] = [
  {
    id: 'dari-sinergii',
    title: 'Дары Синергии',
    summary: 'Сайт компании «Дары Синергии».',
    role: 'Сайт компании',
    url: 'https://dari-sinergii.ru',
    icon: 'browser',
    order: 1,
  },
];
export const services: Service[] = [];
export const contacts: Contact[] = [];

function isSafeUrl(value: string, protocols: string[]): boolean {
  try { return protocols.includes(new URL(value).protocol); }
  catch { return false; }
}

for (const project of projects.filter(p => !p.draft)) {
  if (!project.title || !project.id || !project.summary || !project.role || !isSafeUrl(project.url, ['https:', 'http:'])) {
    throw new Error(`Invalid published project: ${project.id}. Supply title, summary, role and an HTTP(S) URL.`);
  }
}
for (const contact of contacts) {
  if (!contact.label || !contact.display || !isSafeUrl(contact.url, ['https:', 'http:', 'mailto:', 'tel:'])) {
    throw new Error(`Invalid contact: ${contact.label}`);
  }
}
export const publishedProjects = projects.filter(p => !p.draft).sort((a, b) => a.order - b.order);
export const isPreview = !publishedProjects.length || !contacts.length || !profile.about;
