import { createUploadthing, type FileRouter } from "uploadthing/next"

const f = createUploadthing()

export const ourFileRouter = {
  idCardUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        url: file.url,
        key: file.key 
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter

