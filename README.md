# Destiny 2 Wishlist Generator (D2WLG)

**Destiny 2 Wishlist Generator** is a powerful, privacy-focused web application designed for Guardians to craft, manage, and export their perfect weapon "God-Rolls". Built with modern web technologies and directly integrated with the Bungie Manifest, it provides a seamless experience for both English and German-speaking players.

## 🚀 Features

### 🔍 Advanced Weapon Discovery
- **Bilingual Search**: Find any weapon using its name or unique Item ID (Hash) in both English and German.
- **Live Manifest Sync**: Powered by the latest Bungie Manifest, ensuring up-to-date data for every season.
- **Smart Filtering**: Filter weapons by rarity, ammo type, and damage type.

### 🛠️ Perk Configuration & Theorycrafting
- **Column-Aware Selection**: Choose multiple perks per column to define your ideal roll combinations.
- **Masterwork Detection**: Automatically identifies Masterwork/Meisterwerk columns for precise configuration.
- **Drag & Drop**: Reorder selected perks within columns for organized exports.

### 📋 Wishlist Management
- **Local Collections**: Save multiple rolls for the same weapon directly in your browser.
- **Metadata Support**: Add custom Roll Names, Descriptions, and Notes to your saved entries.
- **Smart Tags**: Apply tags like `PvE`, `PvP`, `Godroll`, `Controller`, or `Mouse` for better organization.

### 📤 Multi-Format Export & Sync
- **DIM (Destiny Item Manager)**: Export as a `.txt` file compatible with DIM's wishlist format, including all notes and tags.
- **Little Light**: Generate a `.json` file tailored for importing into the Little Light mobile app.
- **CSV Support**: Export your data to spreadsheet software like Excel or Google Sheets.
- **Internal JSON**: Save and load your entire configuration for backup or sharing.

### 🌓 Premium UI/UX
- **Glassmorphism Design**: A modern, sleek interface with vibrant colors and smooth animations.
- **Theme Support**: Choose between Light, Dark, or System-based coloring.
- **Privacy First**: No cloud storage, no account required. All your data stays locally in your browser's IndexedDB/LocalStorage.

## 📖 Usage Guide

1. **Find a Weapon**: Use the search bar at the top to find a weapon.
2. **Select Perks**: Click on the perks in the "Perk Configuration" panel. You can select multiple perks in the same column.
3. **Customize Info**: Add a name (e.g., "PvP Godroll") and notes if desired. Use tags for easier filtering later.
4. **Save**: Click "Add" to save the roll to your wishlist.
5. **Export**: Use the export buttons on the left sidebar to generate files for DIM, Little Light, or CSV.

## 🔒 Privacy & Data

This application values your privacy. **No data is sent to a server.**
- **Manifest Cache**: The Bungie Manifest is cached in your browser's IndexedDB for lightning-fast subsequent loads and offline support.
- **User Data**: Your wishlist and settings are strictly local. Clearing your browser cache or IndexedDB will remove your data. Use the **Export JSON** feature to create backups.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Made with ❤️ for the Destiny 2 Community.*
