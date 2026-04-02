# Image Upload Setup Guide

## Overview
The announcements system now includes comprehensive image upload functionality, allowing admins to upload images directly to Supabase Storage instead of just providing URLs.

## Features Added

### 1. ImageUpload Component
- **Drag & Drop Interface**: Intuitive drag and drop functionality
- **File Validation**: Automatic validation of file type and size
- **Progress Indication**: Visual feedback during upload process
- **Preview**: Real-time preview of uploaded images
- **Error Handling**: Comprehensive error handling with user feedback
- **Dual Mode**: Toggle between file upload and URL input

### 2. Storage Integration
- **Supabase Storage**: Direct integration with Supabase Storage
- **Dedicated Bucket**: 'announcements' bucket for organized file management
- **Security**: Admin-only upload permissions with RLS policies
- **Automatic Cleanup**: Images are deleted when announcements are removed

### 3. File Management
- **Unique Naming**: Automatic generation of unique filenames
- **Size Limits**: 5MB maximum file size
- **Format Support**: JPEG, PNG, WebP, GIF
- **Public URLs**: Automatic generation of public URLs for uploaded images

## Setup Instructions

### Step 1: Create Storage Bucket
Run the following SQL in your Supabase SQL editor:

```sql
-- Execute the contents of setup_storage_bucket.sql
```

This will:
- Create the 'announcements' storage bucket
- Set up proper RLS policies
- Configure file size limits and allowed MIME types

### Step 2: Verify Storage Configuration
1. Go to your Supabase Dashboard
2. Navigate to Storage
3. Verify the 'announcements' bucket exists
4. Check that the bucket is set to public

### Step 3: Test Upload Functionality
1. Go to Admin Dashboard → Announcements
2. Click "Add Announcement"
3. In the Image section, try uploading a test image
4. Verify the image appears in the preview
5. Save the announcement and check it displays correctly

## Component Usage

### ImageUpload Component Props
```typescript
interface ImageUploadProps {
  value?: string;           // Current image URL
  onChange: (url: string) => void;  // Callback when image changes
  onRemove: () => void;     // Callback when image is removed
  disabled?: boolean;       // Disable upload functionality
}
```

### Example Usage
```tsx
import ImageUpload from "@/components/ImageUpload";

<ImageUpload
  value={imageUrl}
  onChange={setImageUrl}
  onRemove={() => setImageUrl("")}
  disabled={uploading}
/>
```

## File Upload Process

### 1. File Selection
- **Drag & Drop**: Users can drag files directly onto the upload area
- **Click to Select**: Click the upload area to open file picker
- **File Validation**: Automatic validation of file type and size

### 2. Upload Process
- **Unique Naming**: Files are renamed with timestamp and random string
- **Storage Upload**: Files are uploaded to Supabase Storage
- **URL Generation**: Public URLs are automatically generated
- **Progress Feedback**: Visual feedback during upload

### 3. Error Handling
- **File Type Validation**: Only image files are accepted
- **Size Validation**: Files must be under 5MB
- **Upload Errors**: Network and storage errors are handled gracefully
- **User Feedback**: Clear error messages are displayed

## Storage Structure

### Bucket Configuration
- **Name**: announcements
- **Public**: Yes (for public image access)
- **File Size Limit**: 5MB
- **Allowed MIME Types**: image/jpeg, image/png, image/webp, image/gif

### File Naming Convention
```
{timestamp}-{random-string}.{extension}
Example: 1704067200000-abc123def456.jpg
```

### RLS Policies
- **Public Read**: Anyone can view announcement images
- **Admin Upload**: Only admins can upload images
- **Admin Update**: Only admins can update images
- **Admin Delete**: Only admins can delete images

## Admin Interface Updates

### Dual Mode Toggle
The admin interface now includes a toggle between:
- **Upload File**: Direct file upload with drag & drop
- **Image URL**: Traditional URL input method

### Enhanced Form
- **Image Preview**: Real-time preview of selected/uploaded images
- **Upload Progress**: Visual feedback during upload process
- **Error Messages**: Clear error messages for failed uploads
- **Remove Functionality**: Easy removal of uploaded images

## Security Features

### Access Control
- **Admin Only**: Only users with admin role can upload images
- **RLS Policies**: Database-level security policies
- **File Validation**: Server-side validation of file types and sizes

### File Management
- **Automatic Cleanup**: Orphaned images are cleaned up when announcements are deleted
- **Unique Names**: Prevents filename conflicts and overwrites
- **Public Access**: Images are publicly accessible for display

## Troubleshooting

### Common Issues

#### 1. Upload Fails
- **Check File Size**: Ensure file is under 5MB
- **Check File Type**: Only image files are supported
- **Check Permissions**: Verify admin role is properly assigned
- **Check Storage**: Verify storage bucket exists and is configured

#### 2. Images Don't Display
- **Check URL**: Verify the image URL is correct
- **Check Bucket**: Ensure bucket is set to public
- **Check RLS**: Verify read policies are properly configured

#### 3. Storage Bucket Issues
- **Bucket Creation**: Ensure the bucket was created successfully
- **RLS Policies**: Verify all policies are applied correctly
- **MIME Types**: Check allowed MIME types are configured

### Debug Steps
1. Check browser console for error messages
2. Verify Supabase Storage configuration
3. Test with different file types and sizes
4. Check network connectivity
5. Verify admin permissions

## Performance Considerations

### File Size Optimization
- **Recommended Size**: 800x400px for optimal display
- **File Compression**: Consider compressing images before upload
- **Format Selection**: WebP provides best compression for modern browsers

### Loading Performance
- **Lazy Loading**: Images load only when needed
- **Progressive Loading**: Images load progressively for better UX
- **Caching**: Browser caching is enabled for uploaded images

## Monitoring and Maintenance

### Storage Usage
- Monitor storage usage in Supabase Dashboard
- Set up alerts for storage limits
- Regularly clean up unused images

### Performance Monitoring
- Monitor upload success rates
- Track upload times and performance
- Monitor storage access patterns

## Future Enhancements

### Planned Features
- **Image Editing**: Basic editing tools (crop, resize, filters)
- **Bulk Upload**: Upload multiple images at once
- **Image Gallery**: Reuse previously uploaded images
- **CDN Integration**: Integrate with CDN for better performance
- **Image Optimization**: Automatic image optimization and compression

### Technical Improvements
- **Progressive Upload**: Resume interrupted uploads
- **Background Processing**: Process images in background
- **Thumbnail Generation**: Automatic thumbnail generation
- **Format Conversion**: Automatic format conversion for optimization

The image upload functionality is now fully integrated and ready for production use!