"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  HardDrive, 
  Upload, 
  Search, 
  Folder, 
  File, 
  Image, 
  FileText,
  Music,
  Video,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Star,
  Grid,
  List,
  Plus,
  FolderPlus
} from "lucide-react";

interface DriveItem {
  id: string;
  name: string;
  type: "folder" | "file";
  size?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    email: string;
    name?: string;
  };
  isShared: boolean;
  isStarred: boolean;
  children?: DriveItem[];
}

interface DriveComponentProps {
  teamId?: string;
}

export default function DriveComponent({ teamId }: DriveComponentProps) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [currentPath, setCurrentPath] = useState<DriveItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDriveItems();
  }, [teamId]);

  const fetchDriveItems = async (parentId?: string) => {
    if (!teamId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ teamId: teamId || "" });
      if (parentId) params.append("parentId", parentId);
      
      const response = await fetch(`/api/drive/files?${params}`);
      const data = await response.json();
      
      // Check if the response is an array (success) or an error object
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("Failed to fetch drive items:", data.error || "Unknown error");
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to fetch drive items:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (files: FileList) => {
    if (!teamId) return;
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("teamId", teamId);
    
    const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : "";
    if (currentFolderId) {
      formData.append("parentId", currentFolderId);
    }

    try {
      const response = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        fetchDriveItems(currentFolderId);
        setShowUploadDialog(false);
      }
    } catch (error) {
      console.error("Failed to upload files:", error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !teamId) return;

    try {
      const response = await fetch("/api/drive/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          type: "folder",
          teamId,
          parentId: currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined
        }),
      });
      if (response.ok) {
        fetchDriveItems(currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined);
        setNewFolderName("");
        setShowCreateFolderDialog(false);
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await fetch("/api/drive/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      fetchDriveItems(currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const toggleStar = async (itemId: string) => {
    try {
      await fetch("/api/drive/files", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, isStarred: !(Array.isArray(items) ? items.find(item => item.id === itemId)?.isStarred : false) }),
      });
      fetchDriveItems(currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined);
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  };

  const shareItem = async (itemId: string) => {
    try {
      const response = await fetch("/api/drive/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (response.ok) {
        fetchDriveItems(currentPath.length > 0 ? currentPath[currentPath.length - 1].id : undefined);
      }
    } catch (error) {
      console.error("Failed to share item:", error);
    }
  };

  const downloadItem = async (item: DriveItem) => {
    try {
      const response = await fetch(`/api/drive/download/${item.id}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to download item:", error);
    }
  };

  const navigateToFolder = (folder: DriveItem) => {
    setCurrentPath([...currentPath, folder]);
    fetchDriveItems(folder.id);
  };

  const navigateBack = () => {
    if (currentPath.length > 0) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      fetchDriveItems(newPath.length > 0 ? newPath[newPath.length - 1].id : undefined);
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="w-8 h-8 text-blue-600" />;
    
    // eslint-disable-next-line jsx-a11y/alt-text
    if (mimeType.startsWith("image/")) return <Image className="w-8 h-8 text-green-600" />;
    if (mimeType.startsWith("video/")) return <Video className="w-8 h-8 text-red-600" />;
    if (mimeType.startsWith("audio/")) return <Music className="w-8 h-8 text-purple-600" />;
    if (mimeType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes("word")) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileText className="w-8 h-8 text-green-500" />;
    
    return <File className="w-8 h-8 text-blue-600" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const filteredItems = Array.isArray(items) ? items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase();
    if (email) {
      const emailName = email.split("@")[0];
      return emailName.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <div className="h-full flex flex-col">
      {!teamId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <HardDrive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Team Selected</h3>
            <p className="text-muted-foreground">Please select a team to access Drive</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-semibold">Drive</h1>
                {currentPath.length > 0 && (
                  <Button variant="outline" onClick={navigateBack}>
                    ← Back
                  </Button>
                )}
                <div className="text-sm text-muted-foreground">
                  {currentPath.length === 0 ? "My Drive" : currentPath.map(f => f.name).join(" / ")}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search files and folders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button onClick={() => setShowCreateFolderDialog(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {isLoading ? (
              // Loading skeleton cards
              Array.from({ length: 8 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div className="w-full space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      selectedItems.has(item.id) ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      if (item.type === "folder") {
                        navigateToFolder(item);
                      } else {
                        setSelectedItems(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(item.id)) {
                            newSet.delete(item.id);
                          } else {
                            newSet.add(item.id);
                          }
                          return newSet;
                        });
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center space-y-2">
                        {item.type === "folder" ? (
                          <Folder className="w-12 h-12 text-blue-600" />
                        ) : (
                          getFileIcon(item.mimeType)
                        )}
                        <div className="w-full text-center">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.type === "file" && item.size && (
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(item.size)}
                            </p>
                          )}
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            {item.isShared && <Share2 className="w-3 h-3 text-blue-500" />}
                            {item.isStarred && <Star className="w-3 h-3 text-yellow-500" />}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        ) : (
              <>
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:bg-accent/50 ${
                      selectedItems.has(item.id) ? "bg-accent" : ""
                    }`}
                    onClick={() => {
                      if (item.type === "folder") {
                        navigateToFolder(item);
                      } else {
                        setSelectedItems(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(item.id)) {
                            newSet.delete(item.id);
                          } else {
                            newSet.add(item.id);
                          }
                          return newSet;
                        });
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        {item.type === "folder" ? (
                          <Folder className="w-8 h-8 text-blue-600" />
                        ) : (
                          getFileIcon(item.mimeType)
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(item.size)}</span>
                            <span>•</span>
                            <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{item.owner.name || item.owner.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {item.isShared && <Share2 className="w-4 h-4 text-blue-500" />}
                          {item.isStarred && <Star className="w-4 h-4 text-yellow-500" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => toggleStar(item.id)}>
                                <Star className="w-4 h-4 mr-2" />
                                {item.isStarred ? "Unstar" : "Star"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => shareItem(item.id)}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              {item.type === "file" && (
                                <DropdownMenuItem onClick={() => downloadItem(item)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => deleteItem(item.id)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
        
        {!isLoading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <HardDrive className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No files match your search." : "Upload files or create folders to get started."}
            </p>
            {!searchQuery && (
              <div className="space-x-2">
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <Button variant="outline" onClick={() => setShowCreateFolderDialog(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">
                Support for all file types. Maximum file size: 10GB.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && uploadFile(e.target.files)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createFolder}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}