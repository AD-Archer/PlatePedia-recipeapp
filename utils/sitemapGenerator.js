/**
 * Sitemap generator utility for PlatePedia
 * Generates a sitemap.xml file for better search engine indexing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllRecipes, getAllCategories } from './jsonDataService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the site - will be used in the sitemap
const BASE_URL = process.env.BASE_URL || 'https://platepedia.vercel.app';

/**
 * Generates the sitemap XML content
 * @returns {Promise<string>} The XML content of the sitemap
 */
export async function generateSitemapXml() {
  try {
    // Get all recipes and categories
    const [recipes, categories] = await Promise.all([
      getAllRecipes(),
      getAllCategories()
    ]);

    // Start XML content
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/recipes/browse', priority: '0.9', changefreq: 'daily' },
      { url: '/users', priority: '0.8', changefreq: 'weekly' },
      { url: '/login', priority: '0.5', changefreq: 'monthly' },
      { url: '/signup', priority: '0.5', changefreq: 'monthly' }
    ];

    // Add static pages to sitemap
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Add recipe pages
    recipes.forEach(recipe => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/recipes/${recipe.id}</loc>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    });

    // Add category pages
    categories.forEach(category => {
      xml += '  <url>\n';
      xml += `    <loc>${BASE_URL}/recipes/browse?category=${encodeURIComponent(category.id)}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    });

    // Close XML
    xml += '</urlset>';

    return xml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
}

/**
 * Generates and serves the sitemap
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export async function serveSitemap(req, res) {
  try {
    const xml = await generateSitemapXml();
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error serving sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Generates and writes the sitemap to a file
 * @returns {Promise<void>}
 */
export async function generateSitemap() {
  try {
    const xml = await generateSitemapXml();
    const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml);
    console.log('Sitemap generated successfully at', sitemapPath);
  } catch (error) {
    console.error('Error writing sitemap file:', error);
  }
} 