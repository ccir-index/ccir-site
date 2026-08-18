// The curated per-issuer page allowlist. slug -> { match: the ledger's
// exact `issuer` string, display }. Ticker and issuer_type are inherited
// from the ledger rows, never restated here.
//
// Lives in its own module (underscore = not a route) because Astro hoists
// getStaticPaths out of the frontmatter: a const defined beside it is not
// in scope there, but an import is. Curated, never slugified — see the
// header comment in [slug].astro for the rulings.
export const ISSUERS: Record<string, { match: string; display: string }> = {
  'coreweave': { match: 'CoreWeave, Inc.', display: 'CoreWeave' },
  'digital-realty': { match: 'Digital Realty Trust, Inc./L.P.', display: 'Digital Realty' },
  'applied-digital': { match: 'Applied Digital Corporation', display: 'Applied Digital' },
  'crusoe': { match: 'Crusoe Energy Systems', display: 'Crusoe' },
  'iren': { match: 'IREN Limited', display: 'IREN' },
  'nebius': { match: 'Nebius Group N.V.', display: 'Nebius' },
  'cipher-mining': { match: 'Cipher Mining Inc. (renamed Cipher Digital Inc.)', display: 'Cipher Mining' },
  'terawulf': { match: 'TeraWulf Inc.', display: 'TeraWulf' },
  'hive-digital': { match: 'HIVE Digital Technologies Ltd.', display: 'HIVE Digital' },
  'soluna': { match: 'Soluna Holdings, Inc.', display: 'Soluna' },
  'hut8': { match: 'Hut 8 Corp.', display: 'Hut 8' },
  'bit-digital': { match: 'Bit Digital, Inc.', display: 'Bit Digital' },
  'core-scientific': { match: 'Core Scientific, Inc.', display: 'Core Scientific' },
  'lambda': { match: 'Lambda', display: 'Lambda' },
  'nscale': { match: 'Nscale', display: 'Nscale' },
  'xai': { match: 'xAI', display: 'xAI' },
  'fermi': { match: 'Fermi Inc.', display: 'Fermi' },
  'riot': { match: 'Riot Platforms, Inc.', display: 'Riot Platforms' },
};
